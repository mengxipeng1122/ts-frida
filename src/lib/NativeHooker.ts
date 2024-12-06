


namespace  MyFrida {

//////////////////////////////////////////////////

/**
 * Base options for any hook action
 */
export type HookActionOptions = {
    /**
     * Whether to hide hook debug output
     */
    hideOutput: boolean;
    
    /**
     * Name to identify this hook
     */  
    hookName: string;
    
    /**
     * Maximum number of times hook can be triggered (-1 for unlimited)
     */
    maxTriggerCount: number;
};

/**
 * Base class for all hook actions
 * Manages hook lifecycle and tracks hook instances
 */
export abstract class BaseHookAction {

    /**
     * Whether to hide hook debug output
     */
    hideOutput: boolean = false;

    /**
     * Name to identify this hook
     */
    hookName: string = 'unnamed_hook';

    /**
     * Maximum number of times hook can be triggered (-1 for unlimited) 
     */
    maxTriggerCount: number = -1;

    /**
     * Current number of times hook has been triggered
     */
    triggerCount: number = 0;

    // Registry of all hook instances
    private static hookRegistry: Map<string, BaseHookAction> = new Map<string, BaseHookAction>();

    /**
     * Initialize hook with options
     */
    protected constructor(options: Partial<HookActionOptions> = {}) {
        Object.assign(this, options);
    }

    /**
     * Check if hook has reached max trigger count
     */
    protected hasReachedMaxTriggers(): boolean {
        return this.maxTriggerCount > 0 && this.triggerCount >= this.maxTriggerCount;
    }

    /**
     * Increment hook trigger count
     */
    protected incrementTriggerCount(): void {
        if (this.maxTriggerCount > 0) {
            this.triggerCount++;
        }
    }

    /**
     * Get hook instance by address
     */
    static getHook(address: NativePointer): BaseHookAction {
        const hook = BaseHookAction.findHook(address);
        if (hook) return hook;
        throw Error(`No hook found at address ${address}`);
    }

    /**
     * Find hook instance by address
     */
    static findHook(address: NativePointer): BaseHookAction | undefined {
        const key = address.toString();
        return this.hookRegistry.get(key);
    }

    /**
     * Register new hook instance
     */
    static registerHook(address: NativePointer, hook: BaseHookAction): void {
        const key = address.toString();
        if (BaseHookAction.hookRegistry.has(key)) {
            throw new Error(`Hook already exists at address "${key}"`);
        }
        hook.install(address);
        BaseHookAction.hookRegistry.set(key, hook);
    }

    /**
     * Remove hook instance
     */
    static removeHook(address: NativePointer): boolean {
        const hook = BaseHookAction.getHook(address);
        hook.uninstall();
        const key = address.toString();
        return this.hookRegistry.delete(key);
    }

    /**
     * List all registered hook addresses
     */
    static listHooks(): string[] {
        return Array.from(this.hookRegistry.keys());
    }

    /**
     * Remove all hooks
     */
    static removeAllHooks(): void {
        this.hookRegistry.forEach((hook, key) => hook.uninstall());
        this.hookRegistry.clear();
    }

    /**
     * Install hook at address
     */
    abstract install(address: NativePointer): void;

    /**
     * Remove hook
     */
    abstract uninstall(): void;

};

type FunctionEnterCallback = (args: NativePointer[], indentStr: string, ctx: InvocationContext) => void;
type FunctionLeaveCallback = (retval: NativePointer, indentStr: string, ctx: InvocationContext) => NativePointer | void;

type FunctionHookOptions = {
    onEnterFunction: FunctionEnterCallback,
    onLeaveFunction: FunctionLeaveCallback,
    showParameterMemory: boolean,
    validateMemoryAccess: boolean, 
    parameterCount: number,
    allowedScopes: string[],
    /**
     * Whether to show callstack on hook
     */
    showCallstack: boolean;
};

export type FunctionHookActionOptions = Partial<HookActionOptions> & Partial<FunctionHookOptions>;

/**
 * Hook for intercepting function calls
 */
export class FunctionHookAction extends BaseHookAction {

    /**
     * Callback when entering function
     */
    onEnterFunction: FunctionEnterCallback = function(args, indentStr, ctx) {};

    /**
     * Callback when leaving function
     */
    onLeaveFunction: FunctionLeaveCallback = function(retval, indentStr, ctx) {};

    /**
     * Whether to dump parameter memory
     */
    showParameterMemory: boolean = false;

    /**
     * Whether to validate memory access
     */
    validateMemoryAccess: boolean = false;

    /**
     * Number of parameters to intercept
     */
    parameterCount: number = 4;

    /**
     * Scopes where hook is active
     */
    allowedScopes: string[] = [];

    /**
     * Frida listener
     */
    listener?: InvocationListener;

    /**
     * Whether hook is currently executing
     */
    isExecuting: boolean = false;

    /**
     * Current invocation context
     */
    invocationContext?: InvocationContext;

    showCallstack: boolean = false;

    /**
     * Current function call depth
     */
    private static callDepth: number = 0;

    /**
     * Call stack of function names
     */
    private static functionStack: string[] = [];

    /**
     * Get indentation string for current depth
     */
    static getIndentString(): string {
        const depth = Math.max(this.callDepth, 0);
        return '  '.repeat(depth);
    }

    /**
     * Initialize function hook
     */
    constructor(options: FunctionHookActionOptions = {}) {
        super(options as Partial<HookActionOptions>);
        Object.assign(this, options as Partial<FunctionHookOptions>);
    }

    /**
     * Check if hook is in allowed scope
     */
    isInAllowedScope(): boolean {
        if (this.allowedScopes.length === 0) {
            return true;
        }
        return this.allowedScopes.some(scope => FunctionHookAction.functionStack.includes(scope));
    }

    /**
     * Install hook at function address
     */
    install(address: NativePointer): void {
        let {
            parameterCount,
            hideOutput,
            showCallstack,
            showParameterMemory,
            validateMemoryAccess,
            onEnterFunction,
            onLeaveFunction,
            hookName
        } = this;
        const self = this;

        // Log function entry
        let logEnter = function(args: NativePointer[], indentStr: string, ctx: InvocationContext) {
            let argStrings: string[] = [];
            for (let i = 0; i < parameterCount; i++) {
                argStrings.push(args[i].toString());
            }
            ( globalThis as any ). console .log(indentStr, 'enter', JSON.stringify(hookName), ' (', argStrings.join(','), ')');
        };

        // Log function exit
        let logExit = function(retval: NativePointer, indentStr: string, ctx: InvocationContext) {
            ( globalThis as any ). console .log(FunctionHookAction.getIndentString(), 'leave', JSON.stringify(hookName), retval);
        }

        // Install Frida interceptor
        this.listener = Interceptor.attach(address, {
            onEnter: function (args: NativePointer[]) {
                if (self.hasReachedMaxTriggers()) return;
                FunctionHookAction.callDepth++;
                self.isExecuting = true;
                if (self.isInAllowedScope()) {
                    FunctionHookAction.functionStack.push(hookName);
                    for (let i = 0; i < parameterCount; i++) {
                        this['args' + i] = args[i];
                    }

                    this.showFun = logEnter;
                    if (!hideOutput) {
                        logEnter(args, FunctionHookAction.getIndentString(), this);
                        if (showParameterMemory) {
                            for (let i = 0; i < parameterCount; i++) {
                                let param = args[i];
                                if (validateMemoryAccess) {
                                    let range = Process.findRangeByAddress(param);
                                    if (range) {
                                        dumpMemory(param);
                                    }
                                } else if (!param.isNull() && param.compare(0x100000) > 0) {
                                    dumpMemory(param);
                                }
                            }
                        }
                        if (showCallstack) {
                            showBacktrace(this);
                        }
                    }
                    if (onEnterFunction) onEnterFunction(args, FunctionHookAction.getIndentString(), this);
                    self.invocationContext = this;
                }
            },
            onLeave: function (retval) {
                delete self.invocationContext;
                let isInScope = self.isInAllowedScope();
                self.isExecuting = false;
                if (self.hasReachedMaxTriggers()) return;
                if (isInScope) {
                    if (!hideOutput) { logExit(retval, FunctionHookAction.getIndentString(), this); }
                    this.showFun = logExit;
                    if (onLeaveFunction) {
                        let ret = onLeaveFunction(retval, FunctionHookAction.getIndentString(), this);
                        if (ret != undefined) { retval.replace(ret); }
                    }
                    FunctionHookAction.functionStack.pop();
                }
                FunctionHookAction.callDepth--;
                self.incrementTriggerCount();
            },
        });
    }

    /**
     * Remove hook
     */
    uninstall(): void {
        if (this.listener != undefined) {
            this.listener.detach();
        }
    }
};

type InlineHookCallback = (stackPointer: NativePointer, parameter: NativePointer) => void;
type PatchGeneratorCallback = (trampolineAddress: NativePointer, hooker: InlineHooker) => [number, ArrayBuffer];

type InlineHookOptions = {
    hookCallback?: InlineHookCallback,
    trampolineAddress: NativePointer;
    hookParameter: NativePointer;
    patchGenerator?: PatchGeneratorCallback;
};

export type InlineHookActionOptions = Partial<HookActionOptions> & Partial<InlineHookOptions>;

/**
 * Hook for intercepting arbitrary instructions
 */
export class InlineHookAction extends BaseHookAction {

    hooker?: InlineHooker;
    hookCallback?: InlineHookCallback;
    trampolineAddress?: NativePointer;
    hookParameter?: NativePointer;
    patchGenerator?: CUSTOM_PATCHER;

    constructor(options: InlineHookActionOptions = {}) {
        super(options as Partial<HookActionOptions>);
        Object.assign(this, options as Partial<InlineHookOptions>);
    }

    getTrampolineSize(): number {
        return this.hooker?.trampolineSize ?? 0;
    }

    install(address: NativePointer): void {

        const {
            hookCallback,
            trampolineAddress,
            hookParameter,
            patchGenerator: customePatcher
        } = this;

        if(hookParameter==undefined) throw Error('Hook parameter is required');
        const self = this;
        const callback = new NativeCallback(function (stackPointer: NativePointer, parameter: NativePointer,) {
            if (self.hasReachedMaxTriggers()) return;
            if (!self.hideOutput) {
                console.log(address, 'triggered',)
            }
            if(hookCallback) hookCallback(stackPointer, parameter);
        }, 'void', ['pointer', 'pointer']);

        this.hooker = inlineHookerFactory(
            address,
            callback,
            hookParameter,
            trampolineAddress,
            customePatcher
        );
        if(this.hooker==undefined) throw Error('Failed to create inline hooker');
        let {size:trampolineSize, originalBytes, debugInfo} = this.hooker.install();
        console.log(`Trampoline size: ${trampolineSize}`)
        console.log(`Original bytes: ${originalBytes}`)
        console.log(`Debug info: ${debugInfo}`)
    }

    /**
     * Remove hook
     */
    uninstall(): void {
        if(this.hooker==undefined) throw Error('No hooker installed');
        InlineHooker.restore(this.hooker.targetAddress);
    }

};

//////////////////////////////////////////////////
// utils functions
/**
 * Hooks the dlopen function to wait for the specified library to be loaded.
 * @param soname The name of the library to wait for.
 * @param afterFun The function to call after the library is loaded.
 * @param beforeFun The function to call before the library is loaded. Default is undefined.
 * @param runNow Whether to call the afterFun immediately if the library is already loaded. Default is false.
 */
export let hookDlopen =(soname:string, afterFun:()=>void, beforeFun?:()=>void|null, runNow?:boolean):void=> {

    // Check if the library is already loaded
    let m  = Process.findModuleByName(soname);
    if(m!=null) {
        ( globalThis as any ). console .log(soname, 'loaded')
        // If the library is already loaded, call the afterFun immediately
        afterFun();
        return;
    }

    var afterDone=false;
    var beforeDone=false;
    let funs:{fname:string, isUtf8:boolean}[] =[];

    // Add the function names and their UTF8 status to the funs array
    if(Process.platform=='linux') {
       funs.push({ fname: 'dlopen',            isUtf8: true})
       funs.push({ fname: 'android_dlopen_ext',isUtf8: true})
    }

    if (Process.platform == 'windows'){
       funs.push({ fname: 'LoadLibraryA',     isUtf8: true })
       funs.push({ fname: 'LoadLibraryW',     isUtf8: false})
       funs.push({ fname: 'LoadLibraryExA',   isUtf8: true })
       funs.push({ fname: 'LoadLibraryExW',   isUtf8: false})
    }

    // Attach the Interceptor to the function and hook it
    funs.forEach(fun=>{
        let funptr = Module.findExportByName(null, fun.fname);
        if(funptr){
            Interceptor.attach(funptr, {
                onEnter: function (args) {
                    // Read the loadpath from the arguments
                    this.loadpath = fun.isUtf8 ? args[0].readUtf8String() : args[0].readUtf16String();
                    // If the loadpath is the specified library and beforeFun is not called yet, call it
                    if (basename(this.loadpath) == soname && !beforeDone) {
                        if (beforeFun) beforeFun();
                        beforeDone = true;
                    }
                },
                onLeave: function (retval) {
                    const loadedModulePath = this.loadpath;
                    // If the return value is not 0, the library is loaded successfully
                    if (!afterDone && retval.toUInt32() != 0 && basename(loadedModulePath) == soname) {
                        afterFun();
                        afterDone = true;
                    }
                },
            });
        }
    })
    // If runNow is not specified or false, do nothing
    if(runNow==undefined) runNow=false;
    if(runNow) afterFun();
}




}
