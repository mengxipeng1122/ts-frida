

namespace MyFrida {

export const minizEnumerateEntriesInZipFile  = (zipfn:string, libpatch:PATHLIB_INFO_TYPE) : string[] => {

    if(libpatch.symbols.enumerateEntriesInZipfile == undefined) throw new Error('can not find enumerateEntries in libpatch');

    let ret:string[] = [];
    const cb = new NativeCallback(function (pname) {
                const name = pname.readUtf8String();
                if(name!=null) ret.push(name);
                return 0;
            },'int',['pointer']);
    const pzipfn = Memory.allocUtf8String(zipfn);
    (globalThis as any). console .log('cb', cb, pzipfn);


    const enumerateEntries = new NativeFunction(libpatch.symbols.enumerateEntriesInZipfile,
        'int', ['pointer', 'pointer'])(
            pzipfn,
            cb,
        );
    (globalThis as any). console .log('cb', cb);
    return ret;
    
}

export const minizReadEntryFromZipfile = (zipfn:string, entryname:string, libpatch:PATHLIB_INFO_TYPE) : ArrayBuffer | null => {
    

    if(libpatch.symbols.readZipEntry == undefined) throw new Error('can not find readZipEntry in libpatch');

    const readZipEntry = new NativeFunction(libpatch.symbols.readZipEntry, 'int', ['pointer', 'pointer', 'pointer']);

    const bytes_length = readZipEntry(
        Memory.allocUtf8String(zipfn),
        Memory.allocUtf8String(entryname),
        ptr(0),
    );

    if (bytes_length < 0) throw new Error(`readZipEntry failed with error code ${bytes_length}`);

    const membuf = Memory.alloc(bytes_length);
    readZipEntry(
        Memory.allocUtf8String(zipfn),
        Memory.allocUtf8String(entryname),
        membuf,
    );

    return membuf.readByteArray(bytes_length)

}

}
