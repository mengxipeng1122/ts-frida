


/**
 * Retrieves the NDK version of an ELF module by name.
 *
 * @param {string} name - The name of the module.
 * @throws {string} - Throws an error if the NDK version is not found.
 * @return {string} - The NDK version of the module.
 */
export const getELFNDKVersion = (name:string):string => {
    // Get the module by name
    const m = Process.getModuleByName(name);

    // Define the pattern to search for in the module's memory
    const pattern = '41 6e 64 72 6f 69 64 00 '; // Android

    // Convert the pattern to hex bytes, without spaces, for scanning.
    const hexPattern = pattern.replace(/s+/g, '');

    // Start scanning memory for the byte pattern.

    // Define the memory protection to scan
    const memoryProtection ='r-x';

    // Find the ranges of memory that match the memory protection
    const founds =  [...
        Process.enumerateRanges(memoryProtection)
            .filter(range => range.base >= m.base && range.base <= m.base.add(m.size))
            // Scan each range for the pattern
            .flatMap(range => Memory.scanSync(range.base, range.size, hexPattern)),
        ];

    // If a match is found, return the NDK version at the specified offset
    if(founds.length>0){
        const { address } = founds[0];
        const NDKVersion = address.add(0xc).readUtf8String();
        if (NDKVersion) return NDKVersion;
    }

    // Throw an error if the NDK version is not found
    throw `can not found NDK version of ${name}`;
};


/**
 * Retrieves the build ID of an ELF module by name.
 *
 * @param {string} name - The name of the module.
 * @throws {string} - Throws an error if the build ID is not found.
 * @return {string} - The build ID of the module.
 */
export const getELFBuildID = (name:string):string => {

    // Get the module by name
    const m = Process.getModuleByName(name);

    // Define the pattern to search for in the module's memory
    const pattern = ' 04 00 00 00 14 00 00 00 03 00 00 00  47 4e 55 00 ';

    // Convert the pattern to hex bytes, without spaces, for scanning.
    const hexPattern = pattern.replace(/s+/g, '');

    // Start scanning memory for the byte pattern.

    const memoryProtection ='r-x';

    // Find the ranges of memory that match the memory protection
    const founds =  [...
        Process.enumerateRanges(memoryProtection)
            .filter(range => range.base >= m.base && range.base <= m.base.add(m.size))
            // Scan each range for the pattern
            .flatMap(range => Memory.scanSync(range.base, range.size, hexPattern, )),
        ];

    // If a match is found, return the build ID at the specified offset
    if(founds.length>0){
        const { address } = founds[0];
        const content = address.add(0x10).readByteArray(0x14);
        if(content) {
            const arrayBuffer = new Uint8Array(content);
            return Array.prototype.map.call(arrayBuffer, (x:number)=>('00' + x.toString(16)).slice(-2)).join('');
        }
    }

    // Throw an error if the build ID is not found
    throw `can not found build ID of ${name}`;
};
