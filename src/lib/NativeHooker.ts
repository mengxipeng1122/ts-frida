


//////////////////////////////////////////////////

import { basename } from "path";
import { dumpMemory, showBacktrace } from "./utils";

// this object records all runtime info related hook
/**
 * An object that records all runtime info related to a hook.
 *
 * @typedef {Object} HookActionOpt
 * @property {boolean} hide - If true, the hooked function will be hidden.
 * @property {string} name - The name of the hooked function.
 * @property {number} maxhit - The maximum number of times the hooked function can be called. If -1, there is no limit.
 */
export type HookActionOpt =  {
    /**
     * If true, the hooked function will be hidden.
     */
    hide        : boolean   ;
    /**
     * The name of the hooked function.
     */
    name        : string    ;
    /**
     * The maximum number of times the hooked function can be called. If -1, there is no limit.
     */
    maxhit      : number    ;
};

/**
 * An abstract class that represents a hook action.
 * It records all runtime info related to a hook.
 */
export abstract class HookAction {

    /**
     * If true, the hooked function will be hidden.
     */
    hide: boolean = false;

    /**
     * The name of the hooked function.
     */
    name: string = 'unknown';

    /**
     * The maximum number of times the hooked function can be called. If -1, there is no limit.
     */
    maxhit: number = -1;

    /**
     * The number of times the hooked function has been called.
     */
    histCount: number = 0;

    // Map to store all instances
    private static instances: Map<string, HookAction> = new Map<string, HookAction>();

    /**
     * Constructor of the HookAction class.
     * @param opts An object that contains optional properties for the hook action.
     */
    protected constructor(opts: Partial<HookActionOpt> = {}) {
        // Check if the name already exists to prevent duplicates
        Object.assign(this, opts);
    }

    /**
     * Checks if the maximum hit count has been reached.
     * @returns True if the maximum hit count has been reached, false otherwise.
     */
    protected beyondMaxHit(): boolean {
        return this.maxhit > 0 && this.histCount > this.maxhit;
    }

    /**
     * Increases the hit count of the hooked function.
     */
    protected increaseHitCount(): void {
        if (this.maxhit > 0) {
            this.histCount++;
        }
    }

    /**
     * Retrieves the hook action instance associated with the given address.
     * @param address The address of the hooked function.
     * @returns The hook action instance.
     * @throws Error if the hook action instance is not found.
     */
    static getInstance(address: NativePointer): HookAction {
        const found = HookAction.findInstance(address);
        if (found) return found;
        throw Error(`can not found hook by ${address}`);
    }

    /**
     * Finds the hook action instance associated with the given address.
     * @param address The address of the hooked function.
     * @returns The hook action instance, or undefined if not found.
     */
    static findInstance(address: NativePointer): HookAction | undefined {
        const key = address.toString();
        return this.instances.get(key);
    }

    /**
     * Adds a new hook action instance to the map.
     * @param address The address of the hooked function.
     * @param instance The hook action instance.
     * @throws Error if an instance with the same address already exists.
     */
    static addInstance(address: NativePointer, instance: HookAction): void {
        const key = address.toString();
        if (HookAction.instances.has(key)) {
            throw new Error(`An instance with the address "${key}" already exists.`);
        }
        // Add the new instance to the map with the name as the key
        instance.hook(address);
        HookAction.instances.set(key, instance);
    }

    /**
     * Removes the hook action instance associated with the given address from the map.
     * @param address The address of the hooked function.
     * @returns True if the instance was removed successfully, false otherwise.
     */
    static removeInstance(address: NativePointer): boolean {
        const instance = HookAction.getInstance(address);
        instance.unhook();
        const key = address.toString();
        return this.instances.delete(key);
    }

    /**
     * Returns an array of all hook action instances.
     * @returns An array of hook action instance names.
     */
    static listInstances(): string[] {
        return Array.from(this.instances.keys());
    }

    /**
     * Removes all hook action instances from the map.
     */
    static removeAllInstances(): void {
        this.instances.forEach((instance, key) => instance.unhook());
        this.instances.clear();
    }

    /**
     * Hooks the function at the given address.
     * @param address The address of the function to hook.
     */
    abstract hook(address: NativePointer): void;

    /**
     * Unhooks the function at the given address.
     */
    abstract unhook(): void;

};
type HookEnterFunType = (args:NativePointer[], tstr:string, thiz:InvocationContext )=>void;
type HookLeaveFunType = (retval:NativePointer, tstr:string, thiz:InvocationContext )=>NativePointer|void;

type HookFunActionOpt =  {
    enterFun        : HookEnterFunType,
    leaveFun        : HookLeaveFunType,
    showCallStack   : boolean,
    showParaMemory  : boolean,
    checkMemory     : boolean,
    nparas          : number, 
    scopes          : string[],
};

export type HookFunActionOptArgs =  Partial<HookActionOpt> & Partial<HookFunActionOpt>;

/**
 * Class representing a hook action for a function.
 * @extends HookAction
 */
export class HookFunAction extends HookAction {

    /**
     * Function to be called when the function is entered.
     */
    enterFun: HookEnterFunType = function(args, tstr, thiz) {};

    /**
     * Function to be called when the function is left.
     */
    leaveFun: HookLeaveFunType = function(retval, tstr, thiz) {};

    /**
     * Whether to show the function call stack.
     */
    showCallStack: boolean = false;

    /**
     * Whether to show the parameter memory.
     */
    showParaMemory: boolean = false;

    /**
     * Whether to check the memory.
     */
    checkMemory: boolean = false;

    /**
     * Number of parameters.
     */
    nparas: number = 4;

    /**
     * Function scopes.
     */
    scopes: string[] = [];

    /**
     * The invocation listener.
     */
    listener?: InvocationListener;

    /**
     * Whether the function is running.
     */
    running: boolean = false;

    /**
     * The invocation context.
     */
    context?: InvocationContext;

    /**
     * The static level of the function.
     */
    private static level: number = 0;

    /**
     * The static function stack.
     */
    private static funStack: string[] = [];

    /**
     * Gets the string representation of the static level.
     * @returns The string representation of the static level.
     */
    static getLevelStr(): string {
        const cnt = Math.max(this.level, 0);
        return '  '.repeat(cnt);
    }

    /**
     * Creates an instance of HookFunAction.
     * @param {HookFunActionOptArgs} opts - The options for the hook action.
     */
    constructor(opts: HookFunActionOptArgs = {}) {
        super(opts as Partial<HookActionOpt>);
        Object.assign(this, opts as Partial<HookFunActionOpt>);
    }

    /**
     * Checks if the function is in the scopes.
     * @returns True if the function is in the scopes, false otherwise.
     */
    isInScopes(): boolean {
        if (this.scopes.length === 0) {
            return true;
        }
        return this.scopes.some(scope => HookFunAction.funStack.includes(scope));
    }

    /**
     * Hooks the function at the given address.
     * @param {NativePointer} address - The address of the function to hook.
     */
    hook(address: NativePointer): void {
        let {
            nparas,
            hide,
            showCallStack,
            showParaMemory,
            checkMemory,
            maxhit,
            enterFun,
            leaveFun,
            name
        } = this;
        let hitcount = 0;
        const thiz = this;

        // Function to be called when the function is entered
        let showEnter = function(args: NativePointer[], tstr: string, thiz: InvocationContext) {
            let targs: string[] = [];
            for (let t = 0; t < nparas; t++) {
                targs.push(args[t].toString());
            }
            console.log(tstr, 'enter', JSON.stringify(name), ' (', targs.join(','), ')');
        };

        // Function to be called when the function is left
        let showLeave = function(retval: NativePointer, tstr: string, thiz: InvocationContext) {
            console.log(HookFunAction.getLevelStr(), 'leave', JSON.stringify(name), retval);
        }

        // Attach an interceptor to the function
        this.listener = Interceptor.attach(address, {
            onEnter: function (args: NativePointer[]) {
                if (thiz.beyondMaxHit()) return;
                HookFunAction.level++;
                thiz.running = true;
                if (thiz.isInScopes()) {
                    HookFunAction.funStack.push(name);
                    for (let i = 0; i < nparas; i++) {
                        this['args' + i] = args[i];
                    }

                    this.showFun = showEnter;
                    if (!hide) {
                        showEnter(args, HookFunAction.getLevelStr(), this);
                        if (showParaMemory) {
                            for (let i = 0; i < nparas; i++) {
                                let param = args[i];
                                if (checkMemory) {
                                    let range = Process.findRangeByAddress(param);
                                    if (range) {
                                        dumpMemory(param);
                                    }
                                } else if (!param.isNull() && param.compare(0x100000) > 0) {
                                    dumpMemory(param);
                                }
                            }
                        }
                        if (showCallStack) {
                            showBacktrace(this);
                        }
                    }
                    if (enterFun) enterFun(args, HookFunAction.getLevelStr(), this);
                    thiz.context = this;
                }
            },
            onLeave: function (retval) {
                delete thiz.context;
                let isInScopes = thiz.isInScopes();
                thiz.running = false;
                if (thiz.beyondMaxHit()) return;
                if (isInScopes) {
                    if (!hide) { showLeave(retval, HookFunAction.getLevelStr(), this); }
                    this.showFun = showLeave;
                    if (leaveFun) {
                        let ret = leaveFun(retval, HookFunAction.getLevelStr(), this);
                        if (ret != undefined) { retval.replace(ret); }
                    }
                    HookFunAction.funStack.pop();
                }
                HookFunAction.level--;
                thiz.increaseHitCount();
            },
        });
    }

    /**
     * Unhooks the function.
     */
    unhook(): void {
        if (this.listener != undefined) {
            this.listener.detach();
        }
    }
};


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
        console.log(soname, 'loaded')
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





