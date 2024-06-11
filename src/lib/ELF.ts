
namespace MyFrida {

interface ELF_FILE_HEADER {
    EI_MAGIC        : number,
    EI_CLASS        : number,
    EI_DATA         : number,
    EI_VERSION      : number,
    EI_OSABI        : number,
    EI_ABIVERSION   : number,
    e_type          : number,
    e_machine       : number,
    e_version       : number,
    e_entry         : NativePointer,

    e_phoff         : NativePointer,
    e_shoff         : NativePointer,
    e_flags         : number,
    e_ehsize        : number,
    e_phentsize     : number,
    e_phnum         : number,
    e_shentsize     : number,
    e_shnum         : number,
    e_shstrndx      : number,
};

const parseElfFileHeader = (p:NativePointer):ELF_FILE_HEADER => {

    switch(Process.arch){
        case "arm": {
            return {
                EI_MAGIC        : p.add(0).readU32(),
                EI_CLASS        : p.add(4).readU8(),
                EI_DATA         : p.add(5).readU8(),
                EI_VERSION      : p.add(6).readU8(),
                EI_OSABI        : p.add(7).readU8(),
                EI_ABIVERSION   : p.add(8).readU8(),

                e_type          : p.add(0x10).readU16(),
                e_machine       : p.add(0x12).readU16(),
                e_version       : p.add(0x14).readU32(),
                e_entry         : p.add(0x18).readPointer(),
                e_phoff         : p.add(0x1c).readPointer(),
                e_shoff         : p.add(0x20).readPointer(),
                e_flags         : p.add(0x24).readU32(),
                e_ehsize        : p.add(0x28).readU16(),
                e_phentsize     : p.add(0x2a).readU16(),
                e_phnum         : p.add(0x2c).readU16(),
                e_shentsize     : p.add(0x2e).readU16(),
                e_shnum         : p.add(0x30).readU16(),
                e_shstrndx      : p.add(0x32).readU16(),
            }
        }
        case "arm64": {
            return {
                EI_MAGIC        : p.add(0).readU32(),
                EI_CLASS        : p.add(4).readU8(),
                EI_DATA         : p.add(5).readU8(),
                EI_VERSION      : p.add(6).readU8(),
                EI_OSABI        : p.add(7).readU8(),
                EI_ABIVERSION   : p.add(8).readU8(),

                e_type          : p.add(0x10).readU16(),
                e_machine       : p.add(0x12).readU16(),
                e_version       : p.add(0x14).readU32(),
                e_entry         : p.add(0x18).readPointer(),
                e_phoff         : p.add(0x20).readPointer(),
                e_shoff         : p.add(0x28).readPointer(),
                e_flags         : p.add(0x30).readU32(),
                e_ehsize        : p.add(0x34).readU16(),
                e_phentsize     : p.add(0x36).readU16(),
                e_phnum         : p.add(0x38).readU16(),
                e_shentsize     : p.add(0x3a).readU16(),
                e_shnum         : p.add(0x3c).readU16(),
                e_shstrndx      : p.add(0x3e).readU16(),
            }
        }break;
        default:
            throw new Error(`unknown arch ${Process.arch}`);
    }
    
}

interface ELF_SECTION_HEADER {
    sh_name             : number,
    sh_type             : number,
    sh_flags            : NativePointer,
    sh_addr             : NativePointer,
    sh_offset           : NativePointer,
    sh_size             : number,
    sh_link             : number,
    sh_info             : number,
    sh_addralign        : NativePointer,
    sh_entsize          : NativePointer,
};

const parseElfSectionHeader = (p:NativePointer):ELF_SECTION_HEADER => {

    switch(Process.arch){
        case "arm": {
            return {
                sh_name             : p.add(0x00).readU32(),
                sh_type             : p.add(0x04).readU32(),
                sh_flags            : p.add(0x08).readPointer(),
                sh_addr             : p.add(0x0c).readPointer(),
                sh_offset           : p.add(0x10).readPointer(),
                sh_size             : p.add(0x14).readPointer().toUInt32(),
                sh_link             : p.add(0x18).readU32(),
                sh_info             : p.add(0x1c).readU32(),
                sh_addralign        : p.add(0x20).readPointer(),
                sh_entsize          : p.add(0x24).readPointer(),
            }
        }
        case "arm64": {
            return {
                sh_name             : p.add(0x00).readU32(),
                sh_type             : p.add(0x04).readU32(),
                sh_flags            : p.add(0x08).readPointer(),
                sh_addr             : p.add(0x10).readPointer(),
                sh_offset           : p.add(0x18).readPointer(),
                sh_size             : p.add(0x20).readPointer().toUInt32(),
                sh_link             : p.add(0x28).readU32(),
                sh_info             : p.add(0x2c).readU32(),
                sh_addralign        : p.add(0x30).readPointer(),
                sh_entsize          : p.add(0x38).readPointer(),
            }
        }break;
        default:
            throw new Error(`unknown arch ${Process.arch}`);
    }
    
}

/**
 * Retrieves the NDK version and build ID of an ELF module by name.
 *
 * @param {ArrayBuffer} fileBuffer - The name of the module.
 * @throws {string} - Throws an error if the NDK version or build ID is not found.
 * @return {{ version?: string, buildId?: string }} - The NDK version and build ID of the module.
 */
export const getELFInfo = (fileBuffer: ArrayBuffer): { ndkVersion?: string, buildId?: string } => {

    const filePointer = Memory.alloc(fileBuffer.byteLength);
    filePointer.writeByteArray(fileBuffer);

    const {
        e_shentsize,
        e_shnum,
        e_shoff,
        e_shstrndx,
    } = parseElfFileHeader(filePointer);

    const sectionHeaderStringTable = parseElfSectionHeader(filePointer.add(e_shoff.add(e_shstrndx * e_shentsize)));

    let ndkVersion: string | undefined;
    let buildId: string | undefined;

    for (let i = 0; i < e_shnum; i++) {
        const sectionHeader = parseElfSectionHeader(filePointer.add(e_shoff.add(i * e_shentsize)));
        const sectionName = filePointer.add(sectionHeaderStringTable.sh_offset).add(sectionHeader.sh_name).readUtf8String();

        if (sectionName?.startsWith('.note.android.ident')) {
            const sectionData = filePointer.add(sectionHeader.sh_offset);

            if (sectionData.add(0x0c).readUtf8String() === 'Android') {
                ndkVersion = sectionData.add(0x18).readUtf8String()?.trim();
            }
        }

        if (sectionName?.startsWith('.note.gnu.build-id')) {
            const sectionData = filePointer.add(sectionHeader.sh_offset);

            if (sectionData.add(0x0c).readUtf8String() === 'GNU') {
                const content = sectionData.add(0x10).readByteArray(0x14);
                if (content) {
                    const arrayBuffer = new Uint8Array(content);
                    buildId = Array.prototype.map.call(arrayBuffer, (byte: number) => ('00' + byte.toString(16)).slice(-2)).join('');
                }
            }
        }
    }

    return {
        ndkVersion,
        buildId,
    };
};

export const getELFInfoInModule = (moduleName:string): { ndkVersion?: string, buildId?: string } => {
    const modulePath = Process.getModuleByName(moduleName).path;
    const fileBuffer = readFileData(modulePath);
    return getELFInfo(fileBuffer);
}

}
