/* internal */


namespace MyFrida {
/**
 * Dump memory contents starting from a given address.
 * 
 * @param p The starting address of the memory to dump.
 * @param l The number of bytes to dump. If not provided, defaults to 32 bytes.
 */
export const dumpMemory = (p: NativePointer, l: number = 0x20): void => {
    (globalThis as any). console .log(
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
export const getDefaultGhighOffset = (): NativePointer => {
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
        (globalThis as any). console .log(message);
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
        (globalThis as any). console .error(errorMessage);
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
 * Callback function for dumping memory to the (globalThis as any). console .
 *
 * @param {NativePointer} sp - Pointer to the memory to be dumped.
 * @param {number} sz - Size of the memory to be dumped.
 * @returns {void}
 */
const _frida_hexdump_callback = new NativeCallback(
    /**
     * Reads the specified amount of memory starting from the specified pointer,
     * and dumps it to the (globalThis as any). console  using the `dumpMemory` function.
     *
     * @param {NativePointer} sp - Pointer to the memory to be dumped.
     * @param {number} sz - Size of the memory to be dumped.
     * @returns {void}
     */
    function(sp: NativePointer, sz: number): void {
        // Dump the specified amount of memory starting from the specified pointer to the (globalThis as any). console .
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
     * NativeCallback that logs a message to the (globalThis as any). console  but does not return anything.
     */
    _frida_dummy       :  _frida_dummy_callback         ,

    /**
     * NativeCallback that logs a message to the (globalThis as any). console  when called.
     */
    _frida_log         :  _frida_log_callback           ,

    /**
     * NativeCallback that logs an error message to the (globalThis as any). console  when called.
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
 * Returns a dictionary of NativeCallbacks that log a message to the (globalThis as any). console 
 * when called. The keys of the dictionary are the names of the functions.
 *
 * @param {string[]} funs - The names of the functions to create callbacks for.
 * @returns {{[key:string]:NativeCallback<'void',[]>}} A dictionary of NativeCallbacks.
 */
export const frida_dummy_symtab = (funs: string[]): { [key: string]: NativeCallback<'void', []> } => {
    /**
     * Returns a NativeCallback that logs a message to the (globalThis as any). console  when called.
     *
     * @param {string} fn - The name of the function to log.
     * @returns {NativeCallback<'void',[]>} The NativeCallback.
     */
    const _frida_callback = (fn: string): NativeCallback<'void', []> => {
        return new NativeCallback(function () {
            (globalThis as any). console .log('call dummy function', fn);
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
    (globalThis as any). console .log(tstr != undefined ? tstr : "", ' callbacktrace ' + callbacktrace);
    
    // Iterate over each address in the backtrace
    callbacktrace.forEach(c => {
        // Get the debug symbol from the address
        let sym = DebugSymbol.fromAddress(c);
        
        // Print the address, the difference between the address and the base address (if provided),
        // and the debug symbol
        (globalThis as any). console .log(tstr != undefined ? tstr : "", c, "(", sobase != undefined ? c.sub(sobase) : "", ")", "=>", sym);
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
 * @param {string} symbolName - The name of the symbol to resolve.
 * @param {(MODINFO_BASETYPE | string)[]} libraries - An array of libraries to search for the symbol.
 * @param {{[key: string]: NativePointer}} [resolvedSymbols] - An optional object containing already resolved symbols.
 * @param {{useFindSymbols?: boolean}} [options] - An optional object containing options.
 * @returns {NativePointer} - The resolved symbol address.
 * @throws {Error} - Throws an error if the symbol cannot be resolved.
 */
export const resolveSymbol = (
        symbolName: string,
        libraries?: (MODINFO_BASETYPE | string)[],
        resolvedSymbols: { [key: string]: NativePointer } = {},
        options: { useFindSymbols?: boolean } = {},
        ): NativePointer => {
    const useFindSymbols = options.useFindSymbols || false;

    let resolvedSymbol: NativePointer | undefined = resolvedSymbols[symbolName];

    if (resolvedSymbol) {
        return resolvedSymbol;
    }

    const findSymbolInModule = (moduleName: string): NativePointer | undefined => {
        const exportByName = Module.findExportByName(moduleName, symbolName) || undefined;
        return exportByName;
    };

    if (libraries) {
        for (const library of libraries) {
            if (typeof library === 'string') {
                resolvedSymbol = findSymbolInModule(library);

                if (resolvedSymbol) {
                    return resolvedSymbol;
                }

                const module = Process.findModuleByName(library);
                if (module) {
                    resolvedSymbol = module.enumerateExports().find((exportedSymbol) => exportedSymbol.name === symbolName)?.address;

                    if (resolvedSymbol) {
                        return resolvedSymbol;
                    }

                    if (useFindSymbols) {
                        resolvedSymbol = module.enumerateSymbols().find((symbol) => symbol.name === symbolName)?.address;
                        if (resolvedSymbol) {
                            return resolvedSymbol;
                        }
                    }
                }
            } else {
                resolvedSymbol = findSymbolInModule(library.name);
                if (resolvedSymbol) {
                    return resolvedSymbol;
                }

                resolvedSymbol = library.symbols[symbolName];
                if (resolvedSymbol) {
                    return resolvedSymbol;
                }
            }
        }
    }

    resolvedSymbol = Module.findExportByName(null, symbolName) ?? undefined;
    if (resolvedSymbol) {
        return resolvedSymbol;
    }

    const modules = Process.enumerateModules();
    if (modules) {
        for (const module of modules) {
            resolvedSymbol = module.findExportByName(symbolName) ?? undefined;
            if (resolvedSymbol) {
                return resolvedSymbol;
            }

            resolvedSymbol = module.enumerateSymbols().find((symbol) => symbol.name === symbolName)?.address;
            if (resolvedSymbol) {
                return resolvedSymbol;
            }
        }
    }

    throw new Error(`Unable to resolve symbol ${symbolName}`);
};


export function readFileData(fpath: string, sz?: number, offset: number = 0): ArrayBuffer {
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

        if(sz==undefined){
            // Get the file size
            fseek(fp, 0, SEEK_END);
            sz = ftell(fp);
            fseek(fp, 0, SEEK_SET);
        }

        const buf = Memory.alloc(sz);
        fseek(fp, offset, SEEK_SET);
        const read = fread(buf, 1, sz, fp);
        if (read.toNumber() !== sz) {
            (globalThis as any). console .log(`error at read file ${fpath}, ${read}/${sz}`);
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

/**
 * Reads the content of a text file.
 * @param {string} fpath - The path of the file to read.
 * @returns {string} - The content of the file as a string.
 * @throws {Error} - If the file cannot be opened or read.
 */
export function readFileText(fpath: string): string {
    const platform = Process.platform;
    // Check if the platform is supported
    if (platform === 'linux' || platform === 'windows') {
        // Define the function pointers
        const fopen = new NativeFunction(Module.getExportByName(null, 'fopen'), 'pointer', ['pointer', 'pointer']);
        const fseek = new NativeFunction(Module.getExportByName(null, 'fseek'), 'int', ['pointer', 'long', 'int']);
        const ftell = new NativeFunction(Module.getExportByName(null, 'ftell'), 'int', ['pointer']);
        const fclose = new NativeFunction(Module.getExportByName(null, 'fclose'), 'int', ['pointer']);
        const fread = new NativeFunction(Module.getExportByName(null, 'fread'), 'size_t', ['pointer', 'size_t', 'size_t', 'pointer']);

        // Define the constants
        const SEEK_SET = 0;
        const SEEK_CUR = 1;
        const SEEK_END = 2;

        // Open the file
        const fp = fopen(Memory.allocUtf8String(fpath), Memory.allocUtf8String('rb'));
        if (fp.isNull()) {
            throw new Error(`open ${fpath} failed`);
        }

        // Get the file size
        fseek(fp, 0, SEEK_END);
        const sz = ftell(fp);
        fseek(fp, 0, SEEK_SET);

        // Allocate memory and read the file
        const buf = Memory.alloc(sz);
        const read = fread(buf, 1, sz, fp);
        if (read.toNumber() !== sz) {
            (globalThis as any). console .log(`error at read file ${fpath}, ${read}/${sz}`);
        }

        // Read the string from the buffer
        const s =  buf.readUtf8String();
        if(s==null){
            throw new Error(`read string failed when read file ${fpath}`);
        }

        // Close the file and return the content
        fclose(fp);
        return s;
    } else {
        throw new Error(`unhandled platform ${platform}`);
    }
}


/**
 * Parses a query string into an object containing an array of values for each key.
 * @param queryString The query string to parse.
 * @returns An object with keys for each unique key in the query string, and an array of values for each key.
 */
export const parseQueryString = (queryString: string): { [key: string]: string[] } => {
    // Initialize an empty object to store the parsed parameters
    const params: { [key: string]: string[] } = {};

    // Use the replace method to parse the query string
    queryString.replace(/([^=?&]+)=([^&]*)/g, function (_m, key, value) {
        // Decode the key and value from percent encoding
        key = decodeURIComponent(key);
        value = decodeURIComponent(value);

        // If the key is not already in the params object, add it as an empty array
        if (!(key in params)) {
            params[key] = [];
        }

        // Push the decoded value onto the array for the key
        params[key].push(value);

        // Return an empty string to replace the matched substring in the query string
        return '';
    });

    // Return the parsed parameters
    return params;
}


/**
 * Converts an ArrayBuffer to a string representation.
 * @param ab - The ArrayBuffer to convert.
 * @returns The string representation of the ArrayBuffer.
 * @throws An error if the argument is not an ArrayBuffer.
 */
export const convertArrayBufferToString = (ab: ArrayBuffer) => {
  // Check that the argument is actually an ArrayBuffer.
  if (!(ab instanceof ArrayBuffer)) {
    throw new Error("Invalid argument: expected an ArrayBuffer");
  }
  
  // Create a Uint8Array from the ArrayBuffer.
  const bufView = new Uint8Array(ab);
  
  // Convert the Uint8Array to an array of strings.
  let aa :string[] = [];
  for (let t = 0; t < bufView.length; t++) {
    let item = bufView[t];
    let str = item.toString();
    aa.push(str);
  }
  
  // Join the array of strings into a single string.
  let s = aa.join(",");
  
  // Return the string representation of the ArrayBuffer.
  return s;
};


export const typedArrayToBuffer=(array: Uint8Array):ArrayBuffer=> {
    return array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset) as ArrayBuffer;
}

export const alignNum=(n:number, align:number):number=>{
    return Math.floor((n+align-1)/align) *align;
}

export const showAsmCode=(p:NativePointer, count?: number):void=>{
    count = count ?? 5;
    let addr = p;
    for(var i = 0; i<count; i++){
        try{
            const inst = Instruction.parse(addr);
            (globalThis as any). console .log(addr, inst.toString())
            addr = addr.add(inst.size);
        }
        catch {
            dumpMemory(addr.and(~1),Process.pointerSize);
            addr = addr.add(Process.pointerSize);
        }
    }
}

export const findInstructInso=(wantinst:string, soname:string):void=>{
    (globalThis as any). console .log('find', wantinst, 'in', soname)
    let m = Process.getModuleByName(soname);
    let addr = m.base;
    do{
        try{
            let inst = Instruction.parse(addr);
            if(inst.mnemonic.toLowerCase().includes(wantinst)){
                (globalThis as any). console .log(addr, inst.toString(),'@',m.name, addr.sub(m.base));
            }
            addr=addr.add(inst.size);
        }
        catch{
            addr=addr.add(2);
        }
    } while(addr.compare(m.base.add(m.size))<0);
    (globalThis as any). console .log('end find', soname)
}

export const getU32BigEndian=(p:NativePointer):number=>{
    let ret = 0;
    ret +=  (p.add(0).readU8() << 0x18)
    ret +=  (p.add(1).readU8() << 0x10)
    ret +=  (p.add(2).readU8() << 0x08)
    ret +=  (p.add(3).readU8() << 0x00)
    return ret>>>0;
}

export const getU16BigEndian=(p:NativePointer):number=>{
    let ret = 0;
    ret +=  (p.add(0).readU8() << 0x08)
    ret +=  (p.add(1).readU8() << 0x00)
    return ret>>>0;
}

export const getU8BigEndian=(p:NativePointer):number=>{
    let ret = 0;
    ret +=  (p.add(0).readU8() << 0x00)
    return ret>>>0;
}

export const getInetAddrInfo=(addrinfo:NativePointer):string=>{
    if(addrinfo.isNull()) throw `addreinfo is null`
    let af = addrinfo.add(0).readU16(); if(af!=2) throw `af is not 2`
    let a0 = addrinfo.add(4).readU8();
    let a1 = addrinfo.add(5).readU8();
    let a2 = addrinfo.add(6).readU8();
    let a3 = addrinfo.add(7).readU8();
    let port  = addrinfo.add(2).readU16();
    return `${a0}.${a1}.${a2}.${a3}:${port}`;
}

export const dumpSoSymbols=(soname:string):void=>{
    let m  = Process.getModuleByName(soname);
    if(!m) throw `can not found so ${soname}`;
    (globalThis as any). console .log(`found ${soname}`)
    (globalThis as any). console .log(JSON.stringify(m));
    m.enumerateExports()
        .forEach(e=>{
            let ee = Object.create(e);
            ee = {...e, offset : e.address.sub(m.base)};
            (globalThis as any). console .log(JSON.stringify(ee))
        })
    m.enumerateSymbols()
        .forEach(s=>{
            let ss = Object.create(s);
            ss = {...s, offset : s.address.sub(m.base)};
            (globalThis as any). console .log(JSON.stringify(ss))
        })
}

export type SYMBOLINFO= {
    address :NativePointer; 
    name    :string;
    type    :string;
    offset  :NativePointer;
};
export type SYMBOLSINFO= {[key:string]:SYMBOLINFO};

export const getSoSymbols = (m:Module):SYMBOLSINFO=>{
    let symbols:SYMBOLSINFO ={};
    (globalThis as any). console .log(JSON.stringify(m));
    m.enumerateExports()
        .forEach(e=>{
            let ee = Object.create(e);
            ee = {...e, offset : e.address.sub(m.base)};
            symbols[e.name] = ee;
        })
    m.enumerateSymbols()
        .forEach(s=>{
            let ss = Object.create(s);
            ss = {...s, offset : s.address.sub(m.base)};
            symbols[s.name] = ss;
        })
    return symbols;
}

export const runFunWithExceptHandling = (f: () => void, modInfos: MODINFOS_TYPE = {}, spCount: number = 50, cb: (pe: Error) => void = (pe) => {}): void => {

    const inspectPointer = (p: NativePointer): string => {
        const module = Process.findModuleByAddress(p);
        if (module) {
            const moduleName = module.name;
            if (moduleName in modInfos) {
                const gp = addressToGhidraOffset(p, moduleName, modInfos);
                const offset = p.sub(module.base);
                return `${p} ${moduleName} @ ${offset} # ${gp}`;
            }
            return `${p} ${moduleName} @ ${p.sub(module.base)}`;
        } else {
            const m = Process.findModuleByAddress(p);
            if (m && modInfos) {
                const gp = addressToGhidraOffset(p, m.name, modInfos);
                const offset = p.sub(m.base);
                return `${p} ${m.name} @ ${offset} # ${gp}`;
            }
            const range = Process.findRangeByAddress(p);
            return `${p} ${module}, ${range}`;
        }
    }

    const handleExceptionContext = (e: Error): void => {
        if ((e as any).context !== undefined) {
            const context = (e as any).context;
            (globalThis as any). console .log(`context: ${JSON.stringify(context)}`)
            (globalThis as any). console .log('called from:\n' +
                Thread.backtrace(context, Backtracer.ACCURATE)
                    .map(DebugSymbol.fromAddress).join('\n') + '\n');
            const pc = context.pc;
            (globalThis as any). console .log('pc', pc, inspectPointer(pc));
            const sp = context.sp;
            (globalThis as any). console .log('sp', sp);
            dumpMemory(sp, Process.pointerSize * spCount);
            for (let t = 0; t < spCount; t++) {
                const p = sp.add(t * Process.pointerSize).readPointer();
                (globalThis as any). console .log(t, inspectPointer(p));
            }
        }
    }

    try {
        f();
    } catch (_e) {
        const e: Error = _e as Error;
        handleExceptionContext(e);
        if (cb !== undefined) cb(e);
    }
}

export const isHex = (h:string):boolean=>{
    let a = parseInt(h, 16);
    let ret = (a.toString(16) === h);
    return ret;
}

export const awaitForCondition = (cond:()=>boolean, callback:()=>void, interval?:number):void =>{
    interval = interval ?? .1;
    var i = setInterval(function () {
        let c = cond();
        if (c) {
            clearInterval(i);
            callback();
        }
    }, interval);
}

export const awaitForLibraryLoaded = (lib:string, callback:()=>void):void=> {
    awaitForCondition(()=>{
      var addr = Module.findBaseAddress(lib);
      return addr!=null;
    }, callback);
}

export const getStringSet=(param:string|string[]):Set<string> =>{
    if(typeof(param) =='string') { return new Set<string>([param]); }
    else return new Set<string>(param);
}

export const exit = ():void=>{
    (globalThis as any). console .log('##########EXIT##########')
}

export const logWithFileNameAndLineNo = (msg:string)=>{
    let getErrorObject = function(){
        try{throw Error('');} catch(err) {return err;}
    }
    let err = getErrorObject() as Error;
    const caller_line = err.stack!=undefined?err.stack.split("\n")[3] : "unknow line";
    // remove `at `
    let index = caller_line?.indexOf('at ');
    let final_caller_line = (index>=0) ?caller_line.slice(index+3) : caller_line;
    (globalThis as any). console .log(final_caller_line, ":", msg)
}

export const getPyCodeFromMemory=(p:NativePointer, sz:number):string=>{
    let pycode = "";
    pycode += `(${p}, [`;
    let bs = p.readByteArray(sz)
    if(bs==null) throw `can not read at ${sz}`
    pycode += new Uint8Array(bs).join(',');
    pycode += `]), `;
    (globalThis as any). console .log(pycode)
    return pycode;
}

export const readMemoryArrayBuffer=(p:NativePointer, sz?:number):ArrayBuffer=>{
    if(sz==undefined) sz = 0x10;
    let ab = p.readByteArray(sz);
    if(ab==null) throw new Error(`read ${sz} bytes from ${p} failed`)
    return ab;
}

export const readString = (p:NativePointer):string =>{
    try{

        let s = p.readUtf8String();
        if(s==null ) throw new Error(`read string form ${p} failed`);
        return s;
    }
    catch(e){
        (globalThis as any). console .log(`read string from ${p} failed, and dump memory `)
        dumpMemory(p, 0x20);
        return "";
    }
}

export const findFuns = (s:string, ignore_case?:boolean, libs?:string[]) =>{
    libs = libs || [];
    ignore_case = ignore_case || false;
    (globalThis as any). console .log('+ findFuns with ',s)
    const handleModule=(m:Module)=>{
        m.enumerateExports()
            .filter( e=>{
                if(ignore_case){ return e.name.toLowerCase().includes(s.toLowerCase()); }
                return e.name.includes(s)
            })
            .forEach(e=>{
                (globalThis as any). console .log('export',JSON.stringify([m,e]),e.address.sub(m.base))
            })
        m.enumerateSymbols()
            .filter(e=> {
                if(ignore_case){ return e.name.toLowerCase().includes(s.toLowerCase()); }
                return e.name.includes(s)
            })
            .forEach(e=>{
                (globalThis as any). console .log('symbol', JSON.stringify([m,e]),e.address.sub(m.base))
            })
        let e = m.findExportByName(s);
        if(e!=null){
            (globalThis as any). console .log('find export', JSON.stringify([m,e]),e.sub(m.base))
        }
    }
    if(libs.length>0){
        libs.forEach(lib=>{
            let m = Process.getModuleByName(lib);
            (globalThis as any). console .log('check', lib, 'and', m)
            if(m!=null) handleModule(m);
        })
    }
    else {
        Process.enumerateModules() .forEach(handleModule)
    }
    (globalThis as any). console .log('- findFuns with ',s);
}

export const monitorMemory=(base:NativePointer, sz:number)=>{
    let ranges:MemoryAccessRange[] = [
        {
            base: base,
            size: sz,
        }
    ];
    MemoryAccessMonitor.enable(ranges,{
        onAccess:function(details){
            (globalThis as any). console .log(JSON.stringify(details))
        },
    })
}

export const isValidPointer = (p:NativePointer):boolean=>{
    let range = Process.findRangeByAddress(p);
    return range!=null;
}


export const toHexString = (bytes:Uint8Array)=>{
    let ss:string[] = []
    bytes.forEach(b=>{
        ss.push((b&0xff).toString(16))
    })
    return ss.join(' ')
}

export const converUInt32ToFloat = (u:number):number=>{
    let buf = new ArrayBuffer(4);
    let uview = new Int32Array(buf);
    let fview  = new Float32Array(buf);
    uview[0] = u; 
    let f = fview[0];
    return f;
}

export const readFloat = (p:NativePointer):number=>{
    let buf = p.readByteArray(4) as ArrayBuffer;
    let dview  = new Float32Array(buf);
    let f = dview[0];
    return f;
}

export const readDouble = (p:NativePointer):number=>{
    let buf = p.readByteArray(8) as ArrayBuffer;
    let dview  = new Float64Array(buf);
    let d = dview[0];
    return d;
}

export const getCurrentFileAndLine = (): string=> {
    let err = new Error();
    let stackTrace = err.stack?.split('\n');
    let fileAndLine = stackTrace?.[2].trim().split(' ');
    let fileAndLineStr = fileAndLine?.[2].trim();
    if (fileAndLineStr) {
        let [fileAndLine] = fileAndLineStr.split(')');
        fileAndLine = fileAndLine.split('(')[1];
        let [filename, lineNumber] = fileAndLine.split(':');
        return `${filename}:${lineNumber}`;
    }
    else{
        return "";
    }
}

export const isFunctionExist = (obj: any, funcName: string)=> {
    if (typeof obj[funcName] === 'function') {
        return true;
    } else {
        return false;
    }
}

/*
 use example
 checkWithInterval(
  // Function to check the condition
  () => myConditionFunction(),

  // Interval time between condition checks in milliseconds
  1000,

  // Maximum time to wait in milliseconds
  5000
).then(() => {
  // This code will run when the condition is met
  (globalThis as any). console .log("Condition is met!");
}).catch(() => {
  // This code will run when the maximum time is reached
  (globalThis as any). console .log("Maximum time reached without meeting condition.");
});

 */
export const waitForCondition = (condition: () => boolean, interval: number, maxTime: number): Promise<void> => {
    return new Promise((resolve, reject) => {
        const startTime = new Date().getTime();
        const checkCondition = () => {
            if (condition()) {
                resolve();
            } else {
                const currentTime = new Date().getTime();
                if (currentTime - startTime >= maxTime) {
                    reject(`Condition not met within ${maxTime}ms`);
                } else {
                    setTimeout(checkCondition, interval);
                }
            }
        };
        checkCondition();
    });
}

export const changeDir=(d:string)=> {
    const getcwd_fun= new NativeFunction(Module.getExportByName(null,'getcwd'),'pointer', ['pointer','int']);
    const chdir_fun = new NativeFunction(Module.getExportByName(null,'chdir'),'int', ['pointer']);
    
    let ret ; 

    let bufsz = Process.pageSize;
    let buf = Memory.alloc(bufsz);
    ret = getcwd_fun(buf, bufsz);
    if(ret.isNull())  throw new Error(`getcwd failed ${ret}`)
    let oldpwd = buf.readUtf8String();

    ret = chdir_fun(Memory.allocUtf8String(d));
    if(ret<0)  throw new Error(`chdir failed ${ret}`);

    ret = getcwd_fun(buf, bufsz);
    if(ret.isNull())  throw new Error(`getcwd failed ${ret}`)
    let newpwd = buf.readUtf8String();

    (globalThis as any). console .log(`change dir ${oldpwd} => ${newpwd} `);

}

export const getBasename = (str: string): string => {
    // Split the string by the forward slash character '/'
    const parts = str.split('/');
    
    // Get the last part of the array (i.e., the basename)
    const basename = parts[parts.length - 1];
    
    // Return the basename
    return basename;
}

let dummy_val_ptr = ptr(0x1000);
export const frida_dummy_valtab =(funs:string[]): {[key:string]:NativePointer} =>{
    let ret :{[key:string]:NativePointer} ={};
    funs.forEach(t=>{ 
        ret[t] = dummy_val_ptr;
        dummy_val_ptr = dummy_val_ptr.add(1);
    })
    return ret;
}

export let readU64 = (p:NativePointer):BigInt=>{
    const low = BigInt(p.add(0x00).readU32());
    const hi  = BigInt(p.add(0x04).readU32());
    return (hi << BigInt(32)) + low;
}


export let callSprintf = (fmt:string,  sprintf_fun?:NativePointer, ...args: NativePointer[]):string | null =>{
    sprintf_fun = sprintf_fun ?? Module.getExportByName(null,'sprintf');
    const buf = Memory.alloc(Process.pageSize);
    const fun = new NativeFunction(sprintf_fun,'int', [
        'pointer',
        'pointer',
        'pointer',
        'pointer',
        'pointer',
        'pointer',
        'pointer',
        'pointer',
        'pointer',
        'pointer',
        'pointer',
        'pointer',
    ])
    const max_paras=10;
    const fun_args:NativePointer[] = Array(max_paras).fill(ptr(0));
    for (let t=0;t<args.length; t++){
        if(t>=max_paras) break;
        fun_args[t] = args[t];
    }
    const fun_args_tuple: [...NativePointer[]] = [...fun_args];
    fun(buf, Memory.allocUtf8String(fmt), 
        fun_args[0],
        fun_args[1],
        fun_args[2],
        fun_args[3],
        fun_args[4],
        fun_args[5],
        fun_args[6],
        fun_args[7],
        fun_args[8],
        fun_args[9],
        )
    return buf.readUtf8String();
}

export type MODINFOS_TYPE = {
    [key: string]:  // modulename 
    {
        ghidraBase?: NativePointer, // ghidra base

        buildId: string, // buildId of the module

        symbols: {

            [key: string]: {
                ghidraOffset: NativePointer,
            },
        }
    }
};

export const getDefaultGhidraBase = ():NativePointer =>{
    if(Process.arch=='arm'  ){ return ptr(0x10000);     }
    if(Process.arch=='arm64'){ return ptr(0x100000);    }
    if(Process.arch=='ia32' ){ return ptr(0x400000);    }
    throw new Error(`unsupported arch ${Process.arch}`);
}

export const ghidraOffset2Address = (soname:string,p:NativePointer, modinfos?:MODINFOS_TYPE) =>{
    let ghidraBase = getDefaultGhidraBase();
    if(undefined != modinfos){
        if(soname in modinfos) {
            let info = modinfos[soname]
            if(info.ghidraBase){ ghidraBase = info.ghidraBase; }
        }
    }
    let m = Process.findModuleByName(soname);
    if(m!=null){
        return p.add(m.base).sub(ghidraBase);
    }
    throw new Error(`can not found module info for ${soname}`)
}

export const addressToGhidraOffset = (pointer: NativePointer, moduleName?: string, moduleInfos: MODINFOS_TYPE = {}) => {
    let ghidraBase = getDefaultGhidraBase();
    if (moduleInfos && moduleName && moduleInfos[moduleName]) {
        const info = moduleInfos[moduleName];
        if(info.ghidraBase){ ghidraBase = info.ghidraBase; }
    } else {
        (globalThis as any). console .warn(`Using default Ghidra offset ${ghidraBase} for ${moduleName}`);
    }

    let module: Module | null = moduleName ? Process.findModuleByName(moduleName) : Process.findModuleByAddress(pointer);

    if (module) {
        return pointer.sub(module.base).add(ghidraBase);
    } else {
        throw new Error(`Cannot find a module named ${moduleName}`);
    }
}

export const dumpBackStraceWithModinfos = ( modinfos:MODINFOS_TYPE, thiz:InvocationContext, tstr?:string) =>{
    var callbacktrace = Thread.backtrace(thiz.context,Backtracer.ACCURATE);
    (globalThis as any). console .log(tstr!=undefined?tstr:"", ' callbacktrace ' + callbacktrace);
    callbacktrace.forEach(c=>{
        let sym =DebugSymbol.fromAddress(c);
        let modname : string| null = null;
        let modoffset : string | null = null;
        let offset  : NativePointer | null= null;
        let m =  Process.findModuleByAddress(c);
        if(m!=null){
            modname   = m.name;
            modoffset = c.sub(m.base).toString();
            if (m.name in modinfos){
                const info = modinfos[m.name];
                offset = addressToGhidraOffset(c,m.name,  modinfos);
            }
        }
        (globalThis as any). console .log(tstr!=undefined?tstr:"", c, modname, sym, modoffset, offset );
    })
}

export type STACK_INFO_TYPE={
    add:NativePointer,
    modname?:string,
    offset?:NativePointer,
    ghidraOfset?:NativePointer,
};
export const inspectStack = (context:CpuContext, modinfos?:MODINFOS_TYPE, n?:number,show?:boolean, full?:boolean):STACK_INFO_TYPE[]=>{
    full = full ?? false;
    n = n ?? 50;
    show = show ?? false;
    let stacks:NativePointer[] = [];
    if(Process.arch=='arm'){
        let cpuContext = context as ArmCpuContext;
        stacks.push(cpuContext.lr)
        let sp = cpuContext.sp;
        for(let t=0;t<n;t++){
            stacks.push(sp.add(Process.pointerSize*t).readPointer())
        }
    }
    else{
        throw new Error(`unhandled case ${Process.arch}`)
    }
    let ret:STACK_INFO_TYPE[] = [];
    for(let t=0;t<stacks.length;t++){
        // skip all non-code 
        const p = stacks[t];
        if(!full){
            let range = Process.findRangeByAddress(p);
            if(range==null) continue;
            if(!range.protection.includes('x')) continue;
        }
        let info:STACK_INFO_TYPE = {add:p};
        let lib = Process.findModuleByAddress(p);
        if(lib!=null){
            info.offset = p.sub(lib.base);
            info.modname = lib.name;
            if(modinfos!=null){
                if(lib.name in modinfos){
                    info.ghidraOfset = addressToGhidraOffset(p,lib.name, modinfos );
                }
            }
        }
        if(show) (globalThis as any). console .log(t, info, JSON.stringify(info));
        ret.push(info);
    }
    return ret;
}

export const  stringToByteArray=(str: string) => {
    const javaString = Java.use('java.lang.String');
    const byteArr = javaString.$new(str).getBytes();
    return Java.array('byte', byteArr);
}

/**
 * Convert an integer into a float number.
 * @param integerNumber - The integer number to convert.
 * @returns The float number.
 */
export const convertIntegerIntoFloat =(integerNumber: number): number => {
    // Create a 32-bit integer array with the given integer number
    const intArray = new Int32Array([integerNumber]);

    // Create a 32-bit float array using the buffer of the integer array
    const floatArray = new Float32Array(intArray.buffer);

    // Get the float number from the float array
    const floatNumber = floatArray[0];

    // Return the float number
    return floatNumber;
}
 
/**
 * Reads a null-terminated UTF-8 string from the memory address pointed to by `p`.
 * 
 * @param p - The memory address to read the string from.
 * @returns The UTF-8 string read from memory, or `null` if the string is not valid.
 */
export const readStdString =(p: NativePointer): string | null => {
    if (p.readU8() & 0x1) {
        // If the lowest bit of the byte at `p` is set, assume that `p` points to a pointer to the string.
        // Read the pointer value from `p` and read the UTF-8 string from the pointed memory address.
        return p.add(Process.pointerSize*2).readPointer().readUtf8String();
    } else {
        // If the lowest bit of the byte at `p` is not set, assume that `p` points directly to the string.
        // Read the UTF-8 string from `p` + 0x01.
        return p.add(0x01).readUtf8String();
    }
}

export let readStdStringVector = (p:NativePointer)=>{
    let arr:string[] = [];
    if(p.readPointer().isNull()) return arr;
    const p0 = p.add(0*Process.pointerSize).readPointer();
    const p1 = p.add(1*Process.pointerSize).readPointer();
    for(let pp = p0;pp.compare(p1)<0;pp=pp.add(Process.pointerSize*3)){
        const s = readStdString(pp);
        if(s!=null) arr.push(s);
    }
    return arr;
}

export let readFloatVector = (p:NativePointer)=>{
    let arr:number[] = [];
    if(p.readPointer().isNull()) return arr;
    const p0 = p.add(0*Process.pointerSize).readPointer();
    const p1 = p.add(1*Process.pointerSize).readPointer();
    for(let pp = p0;pp.compare(p1)<0;pp=pp.add(4)){
        const f = convertIntegerIntoFloat(pp.readU32());
        arr.push(f);
    }
    return arr;
}

let g_modinfos:MODINFOS_TYPE|null = null;
export const setModInfos =  function(modinfos?:MODINFOS_TYPE){
    if(modinfos==undefined) g_modinfos = null;
    else g_modinfos = modinfos;

}

export let findMaxOccurrenceNumber = (numbers: number[]): number | undefined => {
    let countMap:{[key:number]:number} = {};

  // Count the occurrences of each pointer
  for (const num of numbers) {
    if(num in countMap){
        countMap[num] = countMap[num] + 1 
    }
    else{
        countMap[num] = 1
    }
  }

  let maxOccurrence = 0;
  let pointerWithMaxOccurrence: number | undefined;

  (globalThis as any). console .log('countMap', JSON.stringify(countMap))

  // Find the pointer with maximum occurrence
  for(let  key in countMap){
    if (countMap.hasOwnProperty(key)) {
        const value = countMap[key];
        if (value > maxOccurrence) {
          maxOccurrence =  value;
          pointerWithMaxOccurrence = parseInt(key);
        }
    }
  }

  return pointerWithMaxOccurrence;
}

export type PATCHLIB_INFO_TYPE  = {


    unload      : ()=>void,

    
    name        : string,

    base        : NativePointer,

    load_size  ?: number;


    cave        : NativePointer,


    symbols     : {[key:string]:NativePointer},

    inits      ?: NativePointer[];

};

export function basename(filename: string): string | null {
    if(!filename) return null;
  // Find the last occurrence of the '/' character
  const lastSlashIndex = filename.lastIndexOf('/');

  // Return the part of the string after the last '/'
  // If there was no '/', the whole filename is returned
  return filename.substring(lastSlashIndex + 1);
}

export function writeFileData(fpath: string, p:NativePointer, sz:number, ) {

    const platform = Process.platform;
    if (platform === 'linux' || platform === 'windows') {
        const fopen = new NativeFunction(Module.getExportByName(null, 'fopen'), 'pointer', ['pointer', 'pointer']);
        const fclose = new NativeFunction(Module.getExportByName(null, 'fclose'), 'int', ['pointer']);
        const fwrite = new NativeFunction(Module.getExportByName(null, 'fwrite'), 'size_t', ['pointer', 'size_t', 'size_t', 'pointer']);

        const fp = fopen(Memory.allocUtf8String(fpath), Memory.allocUtf8String('wb'));
        if (fp.isNull()) {
            throw new Error(`open ${fpath} failed`);
        }

        const wrote = fwrite(p, 1, sz, fp);
        fclose(fp);

        if(wrote.toNumber()!=sz){
            throw new Error(`write file ${fpath} failed, wrote ${wrote}/${sz}`);
        }


        return 
    } else {
        throw new Error(`unhandled platform ${platform}`);
    }
}

export function writeFileText(fpath: string, text:string) {

    const platform = Process.platform;
    if (platform === 'linux' || platform === 'windows') {
        const fopen = new NativeFunction(Module.getExportByName(null, 'fopen'), 'pointer', ['pointer', 'pointer']);
        const fclose = new NativeFunction(Module.getExportByName(null, 'fclose'), 'int', ['pointer']);
        const fwrite = new NativeFunction(Module.getExportByName(null, 'fwrite'), 'size_t', ['pointer', 'size_t', 'size_t', 'pointer']);

        const fp = fopen(Memory.allocUtf8String(fpath), Memory.allocUtf8String('w'));
        if (fp.isNull()) {
            throw new Error(`open ${fpath} failed`);
        }

        const p = Memory.allocUtf8String(text);

        if(p==null) throw new Error(`alloc memory for text failed`)
        if (p.isNull()) throw new Error(`alloc memory for text failed`)

        const sz = text.length;

        const wrote = fwrite(p, 1, sz,  fp);
        fclose(fp);

        if(wrote.toNumber()!=sz){
            throw new Error(`write file ${fpath} failed, wrote ${wrote}/${sz}`);
        }


        console.log(`p`,p)


        return 
    } else {
        throw new Error(`unhandled platform ${platform}`);
    }
}

// export const getInstructors =  (opts:{thumb?:boolean}) => {
//     if(Process.arch=='arm'){
//         const thumb = opts.thumb==undefined?false:opts.thumb;
//         if(thumb){
//             return  {ThumbRelocator,ThumbWriter}
//         }
//         else {
//             return  {ArmRelocator,ArmWriter}
//         }
//     }
//     else if(Process.arch=='arm64'){
//         return {Arm64Relocator,Arm64Writer}
//     }
//     else if(Process.arch=='ia32' || Process.arch=='x64'){
//         return {X86Relocator,X86Writer}
//     }
//     else {
//         throw new Error(`unhandled arch ${Process.arch}`)
//     }
// }


}
