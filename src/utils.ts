


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


export const helloWorld = (): void => {
    console.log("Hello world");
}

