

export type MODINFO_BASETYPE = {

    unload? : ()=>void;

    name    : string, 

    base    : NativePointer,

    cave?   : NativePointer,

    symbols : {[key:string]:NativePointer},

    hookids : {[key:string]:null | InvocationListener},

    functions : {[key:string]:{

        hook:Function,

        unhook:Function,

        call:Function,

    }},

    variables : {},

};

//////////////////////////////////////////////////
// base data type access functions

export const resolveSymbol = (name: string, libraries: (MODINFO_BASETYPE | string)[], symbols?: {[key: string]: NativePointer}): NativePointer => {
    if (symbols && symbols[name]) {
        return symbols[name];
    }

    if (libraries) {
        for (const lib of libraries) {
            if (typeof lib === 'string') {
                const module = Process.getModuleByName(lib);
                const exportAddress = module.enumerateExports().find(e => e.name === name)?.address
                    || module.enumerateSymbols().find(e => e.name === name)?.address
                    || Module.findExportByName(lib, name);
                if (exportAddress) {
                    return exportAddress;
                }
            } else {
                const exportByName = Module.findExportByName(lib.name, name);
                if (exportByName) {
                    return exportByName;
                }
                if (lib.symbols[name]) {
                    return lib.symbols[name];
                }
            }
        }
    }

    const exportByNameNull = Module.findExportByName(null, name);
    if (exportByNameNull) {
        return exportByNameNull;
    }

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
