
export const minizReadEntryFromZipfile = (zipfn:string, entryname:string, libpatch:any) : ArrayBuffer | null => {
    

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
