


/**
 * Dump memory contents starting from a given address.
 * 
 * @param p The starting address of the memory to dump.
 * @param l The number of bytes to dump. If not provided, defaults to 32 bytes.
 */
export const dumpMemory = (p: NativePointer, l: number = 0x20): void => {
    console.log(
        hexdump(p, {
            offset: 0,
            length: l,
            header: true,
            ansi: false,
        })
    );
};

/**
 * Returns the default Ghidra offset for the current process architecture.
 *
 * @returns {NativePointer} The default Ghidra offset.
 * @throws {Error} If the process architecture is not supported.
 */
const getDefaultGhighOffset = (): NativePointer => {
    // Mapping of process architecture to the Ghidra offset.
    const ghidraOffsetMap: { [key: string]: NativePointer } = {
        arm:    ptr(0x10000),
        arm64:  ptr(0x100000),
        ia32:   ptr(0x400000),
    };

    // Get the Ghidra offset for the current process architecture.
    const ghidraOffset: NativePointer | undefined = ghidraOffsetMap[Process.arch];

    // Throw an error if the process architecture is not supported.
    if (ghidraOffset === undefined) {
        throw new Error(`unsupported arch ${Process.arch}`);
    }

    return ghidraOffset;
}



/**
 * Dummy callback function.
 *
 * This function is a dummy callback function that does nothing.
 * It is used as a placeholder for callbacks that are not needed.
 *
 * @returns {void}
 */
const _frida_dummy_callback = new NativeCallback(
    // The actual implementation of the callback function.
    function(){
        // This function does nothing.
    },
    // The return type of the callback function.
    'void',
    // The argument types of the callback function.
    []
);


/**
 * Callback function for logging messages.
 *
 * @param {NativePointer} sp - Pointer to the message string.
 * @returns {void}
 */
const _frida_log_callback = new NativeCallback(
    // Implementation of the callback function.
    /**
     * Reads the message string from the specified pointer and logs it.
     *
     * @param {NativePointer} sp - Pointer to the message string.
     * @returns {void}
     */
    function(sp: NativePointer): void {
        const message: string | null = sp.readUtf8String();
        console.log(message);
    },
    // Return type of the callback function.
    'void',
    // Argument types of the callback function.
    ['pointer']
);

/**
 * Callback function for logging error messages and optionally exiting the application.
 *
 * @param {NativePointer} sp - Pointer to the error message string.
 * @param {number} exitApp - Flag indicating whether the application should exit after logging the error.
 * @returns {void}
 */
const _frida_err_callback = new NativeCallback(
    /**
     * Reads the error message string from the specified pointer, logs it as an error,
     * and optionally exits the application.
     *
     * @param {NativePointer} sp - Pointer to the error message string.
     * @param {number} exitApp - Flag indicating whether the application should exit after logging the error.
     * @returns {void}
     */
    function(sp: NativePointer, exitApp: number): void {
        const errorMessage: string | null = sp.readUtf8String();
        console.error(errorMessage);
        if (exitApp) {
            // Exit the application with an error code of -9.
            new NativeFunction(Module.getExportByName(null, 'exit'), 'int', ['int'])(-9);
            // Throw an error indicating that an error occurred and the application is exiting.
            throw 'err occured and exit';
        } else {
            // Throw an error indicating that an error occurred.
            throw 'err occured';
        }
    },
    'void',
    ['pointer', 'int']
);

/**
 * Callback function for dumping memory to the console.
 *
 * @param {NativePointer} sp - Pointer to the memory to be dumped.
 * @param {number} sz - Size of the memory to be dumped.
 * @returns {void}
 */
const _frida_hexdump_callback = new NativeCallback(
    /**
     * Reads the specified amount of memory starting from the specified pointer,
     * and dumps it to the console using the `dumpMemory` function.
     *
     * @param {NativePointer} sp - Pointer to the memory to be dumped.
     * @param {number} sz - Size of the memory to be dumped.
     * @returns {void}
     */
    function(sp: NativePointer, sz: number): void {
        // Dump the specified amount of memory starting from the specified pointer to the console.
        dumpMemory(sp, sz);
    },
    'void',
    ['pointer', 'uint']
);

/**
 * Native callback function for inspecting a pointer.
 *
 * @param {NativePointer} p - Pointer to inspect.
 * @param {NativePointer} module_name - Buffer to write the module name to.
 * @param {number} module_name_len - Length of the module name buffer.
 * @param {NativePointer} offset - Buffer to write the module offset to.
 * @param {NativePointer} ghidra_offset - Buffer to write the Ghidra offset to.
 * @returns {number} 0 if successful, -1 if the module name buffer is too small.
 */
const _frida_inspect_ptr_callback = new NativeCallback(
    /**
     * Inspects a pointer and returns the module name, module offset, and Ghidra offset.
     * If the module name buffer is too small, -1 is returned.
     *
     * @param {NativePointer} p - Pointer to inspect.
     * @param {NativePointer} module_name - Buffer to write the module name to.
     * @param {number} module_name_len - Length of the module name buffer.
     * @param {NativePointer} offset - Buffer to write the module offset to.
     * @param {NativePointer} ghidra_offset - Buffer to write the Ghidra offset to.
     * @returns {number} 0 if successful, -1 if the module name buffer is too small.
     */
    function(
        p                   :NativePointer, 
        module_name         :NativePointer, 
        module_name_len     :number,
        offset              :NativePointer,
        ghidra_offset       :NativePointer
    ): number {
        // Get the default Ghidra offset.
        let ghidraOffset = getDefaultGhighOffset();

        // Find the module containing the pointer.
        let m = Process.findModuleByAddress(p);
        if(m==null) return -1; // If the module is not found, return -1.
        const mname = m.name; // Get the module name.
        if(mname.length>=module_name_len) return -1; // If the module name buffer is too small, return -1.
        module_name.writeUtf8String(mname); // Write the module name to the buffer.

        // Calculate the module offset.
        const moffset = p.sub(m.base);
        offset.writePointer(moffset); // Write the module offset to the buffer.

        // Calculate the Ghidra offset.
        const goffset = moffset.add(ghidraOffset);
        ghidra_offset.writePointer(goffset); // Write the Ghidra offset to the buffer.
        
        return 0; // Return 0 if successful.
    }, 
    'int', // The return type of the function.
    ['pointer','pointer', 'uint','pointer', 'pointer'] // The types of the function arguments.
);

/**
 * Dictionary of NativeCallbacks that provide dummy functionality.
 * The keys of the dictionary are the names of the functions.
 */
export const frida_symtab = {
    /**
     * NativeCallback that logs a message to the console but does not return anything.
     */
    _frida_dummy       :  _frida_dummy_callback         ,

    /**
     * NativeCallback that logs a message to the console when called.
     */
    _frida_log         :  _frida_log_callback           ,

    /**
     * NativeCallback that logs an error message to the console when called.
     * If the exitApp flag is set, the program will exit with a non-zero status.
     */
    _frida_err         :  _frida_err_callback           ,

    /**
     * NativeCallback that logs memory contents starting from a given address.
     * The default number of bytes to dump is 32.
     */
    _frida_hexdump     :  _frida_hexdump_callback       ,

    /**
     * NativeCallback that inspects a pointer and returns the module name,
     * module offset, and Ghidra offset.
     * If the module name buffer is too small, -1 is returned.
     */
    _frida_inspect_ptr :  _frida_inspect_ptr_callback   ,
};



/**
 * Returns a dictionary of NativeCallbacks that log a message to the console
 * when called. The keys of the dictionary are the names of the functions.
 *
 * @param {string[]} funs - The names of the functions to create callbacks for.
 * @returns {{[key:string]:NativeCallback<'void',[]>}} A dictionary of NativeCallbacks.
 */
export const frida_dummy_symtab = (funs: string[]): { [key: string]: NativeCallback<'void', []> } => {
    /**
     * Returns a NativeCallback that logs a message to the console when called.
     *
     * @param {string} fn - The name of the function to log.
     * @returns {NativeCallback<'void',[]>} The NativeCallback.
     */
    const _frida_callback = (fn: string): NativeCallback<'void', []> => {
        return new NativeCallback(function () {
            console.log('call dummy function', fn);
        }, 'void', []);
    }

    let ret: { [key: string]: NativeCallback<'void', []> } = {};
    funs.forEach(t => { ret[t] = _frida_callback(t); });
    return ret;
};




/**
 * Logs the backtrace of the current thread.
 *
 * @param {InvocationContext} thiz - The invocation context of the current thread.
 * @param {NativePointer} sobase - The base address of the shared object.
 * @param {string} tstr - The prefix string to print.
 */
export const showBacktrace = (thiz: InvocationContext, sobase?: NativePointer, tstr?: string): void => {
    // Get the backtrace of the current thread
    var callbacktrace = Thread.backtrace(thiz.context, Backtracer.ACCURATE);
    
    // Print the prefix string and the backtrace
    console.log(tstr != undefined ? tstr : "", ' callbacktrace ' + callbacktrace);
    
    // Iterate over each address in the backtrace
    callbacktrace.forEach(c => {
        // Get the debug symbol from the address
        let sym = DebugSymbol.fromAddress(c);
        
        // Print the address, the difference between the address and the base address (if provided),
        // and the debug symbol
        console.log(tstr != undefined ? tstr : "", c, "(", sobase != undefined ? c.sub(sobase) : "", ")", "=>", sym);
    });
}



/**
 * The base data type for module information.
 *
 * Represents information about a module.
 * Contains the name of the module, the base address, the cave address, the symbols, the hook ids, the functions, and the variables.
 */
export type MODINFO_BASETYPE = {

    /**
     * The function to be called when the module is unloaded.
     * This is an optional function.
     */
    unload? : ()=>void;

    /**
     * The name of the module.
     */
    name    : string, 

    /**
     * The base address of the module.
     */
    base    : NativePointer,

    /**
     * The cave address of the module.
     * This is an optional field.
     */
    cave?   : NativePointer,

    /**
     * The symbols of the module.
     * Each symbol is a key-value pair, where the key is the symbol name and the value is the symbol address.
     */
    symbols : {[key:string]:NativePointer},

    /**
     * The hook ids of the module.
     * Each hook id is a key-value pair, where the key is the hook id name and the value is the hook id value or null.
     */
    hookids : {[key:string]:null | InvocationListener},

    /**
     * The functions of the module.
     * Each function is a key-value pair, where the key is the function name and the value is an object containing the hook, unhook, and call functions.
     */
    functions : {[key:string]:{

        /**
         * The hook function of the module.
         */
        hook:Function,

        /**
         * The unhook function of the module.
         */
        unhook:Function,

        /**
         * The call function of the module.
         */
        call:Function,

    }},

    /**
     * The variables of the module.
     * This is an empty object.
     */
    variables : {[key:string]:{

    }},

};


/**
 * Resolves a symbol in one or more libraries.
 *
 * @param {string} name - The name of the symbol to resolve.
 * @param {(MODINFO_BASETYPE | string)[]} libraries - An array of libraries to search for the symbol.
 * @param {{[key: string]: NativePointer}} [symbols] - An optional object containing already resolved symbols.
 * @param {{useFindSymbols?: boolean}} [opts] - An optional object containing options.
 * @param {boolean} [opts.useFindSymbols] - A flag indicating whether to use the Module.enumerateSymbols() method to find the symbol.
 * @throws {Error} - Throws an error if the symbol cannot be resolved.
 * @return {NativePointer} - The resolved symbol address.
 */
export const resolveSymbol = (
    name: string, 
    libraries: (MODINFO_BASETYPE | string)[], 
    symbols?: {[key: string]: NativePointer},
    opts?: {useFindSymbols?:boolean},
): NativePointer => {

    // Set the useFindSymbols flag to the value in opts or false.
    const useFindSymbols = opts?.useFindSymbols || false;

    // Check if the symbol is already resolved.
    if (symbols && symbols[name]) {
        return symbols[name];
    }

    // Iterate over the libraries.
    for (const lib of libraries) {
        // If the library is a string, search for the symbol in the module.
        if (typeof lib === 'string') {
            const module = Process.getModuleByName(lib);
            const exportAddress = Module.findExportByName(lib, name) ||
                module.enumerateExports().find(e => e.name === name)?.address ||
                (useFindSymbols && module.enumerateSymbols().find(e => e.name === name)?.address);
            if (exportAddress) {
                return exportAddress;
            }
        } else {
            // If the library is an object, check if the symbol is in the symbols object.
            const exportByName = Module.findExportByName(lib.name, name);
            if (exportByName) {
                return exportByName;
            }
            if (lib.symbols[name]) {
                return lib.symbols[name];
            }
        }
    }

    // If the symbol is not found in any library, search for it in the null module.
    const exportByNameNull = Module.findExportByName(null, name);
    if (exportByNameNull) {
        return exportByNameNull;
    }

    // If the symbol cannot be resolved, throw an error.
    throw new Error(`Unable to resolve symbol ${name}`);
};

export function readFileData(fpath: string, sz: number, offset: number = 0): ArrayBuffer {
    if (sz <= 0) {
        return new ArrayBuffer(0);
    }
    const platform = Process.platform;
    if (platform === 'linux' || platform === 'windows') {
        const fopen = new NativeFunction(Module.getExportByName(null, 'fopen'), 'pointer', ['pointer', 'pointer']);
        const fseek = new NativeFunction(Module.getExportByName(null, 'fseek'), 'int', ['pointer', 'long', 'int']);
        const fclose = new NativeFunction(Module.getExportByName(null, 'fclose'), 'int', ['pointer']);
        const fread = new NativeFunction(Module.getExportByName(null, 'fread'), 'size_t', ['pointer', 'size_t', 'size_t', 'pointer']);
        const buf = Memory.alloc(sz);
        const SEEK_SET = 0;

        const fp = fopen(Memory.allocUtf8String(fpath), Memory.allocUtf8String('rb'));
        if (fp.isNull()) {
            throw new Error(`open ${fpath} failed`);
        }
        fseek(fp, offset, SEEK_SET);
        const read = fread(buf, 1, sz, fp);
        if (read.toNumber() !== sz) {
            console.log(`error at read file ${fpath}, ${read}/${sz}`);
        }
        const ab = buf.readByteArray(sz);
        if (ab === null) {
            throw new Error(`read byte array failed when read file ${fpath}`);
        }
        fclose(fp);
        return ab;
    } else {
        throw new Error(`unhandled platform ${platform}`);
    }
}

export function readFileText(fpath: string): string {
    const platform = Process.platform;
    if (platform === 'linux' || platform === 'windows') {
        const fopen = new NativeFunction(Module.getExportByName(null, 'fopen'), 'pointer', ['pointer', 'pointer']);
        const fseek = new NativeFunction(Module.getExportByName(null, 'fseek'), 'int', ['pointer', 'long', 'int']);
        const ftell = new NativeFunction(Module.getExportByName(null, 'ftell'), 'int', ['pointer']);
        const fclose = new NativeFunction(Module.getExportByName(null, 'fclose'), 'int', ['pointer']);
        const fread = new NativeFunction(Module.getExportByName(null, 'fread'), 'size_t', ['pointer', 'size_t', 'size_t', 'pointer']);
        const SEEK_SET = 0;
        const SEEK_CUR = 1;
        const SEEK_END = 2;

        const fp = fopen(Memory.allocUtf8String(fpath), Memory.allocUtf8String('rb'));
        if (fp.isNull()) {
            throw new Error(`open ${fpath} failed`);
        }
        fseek(fp, 0, SEEK_END);
        const sz = ftell(fp);
        fseek(fp, 0, SEEK_SET);
        const buf = Memory.alloc(sz);
        const read = fread(buf, 1, sz, fp);
        if (read.toNumber() !== sz) {
            console.log(`error at read file ${fpath}, ${read}/${sz}`);
        }
        const s =  buf.readUtf8String();
        if(s==null){
            throw new Error(`read string failed when read file ${fpath}`);
        }
        fclose(fp);
        return s;
    } else {
        throw new Error(`unhandled platform ${platform}`);
    }
}

