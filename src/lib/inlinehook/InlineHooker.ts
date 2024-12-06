

'use strict';



export type CUSTOM_PATCHER = (trampolineAddr: NativePointer, size: number, hooker: InlineHooker) => [number, ArrayBuffer];

const defaultTrampolineSize = 0x100;

// InlineHooker provides base functionality for inline function hooking
// It handles:
// - Allocating trampoline memory for hook code
// - Installing hooks by patching original function
// - Backing up and restoring original instructions
// - Managing hook state and preventing double hooks
// - Providing abstract methods for architecture-specific implementations
export abstract class InlineHooker {
    public    targetAddress: NativePointer;
    protected hookFunction: NativePointer;
    protected trampolineAddress: NativePointer;
    protected trampolineCode: NativePointer = ptr(0);
    protected parameter: NativePointer;
    protected customPatcher?: CUSTOM_PATCHER;
    public    trampolineSize: number;

    constructor(
        targetAddress: NativePointer,
        hookFunction: NativePointer,
        parameter: NativePointer, 
        trampolineAddress?: NativePointer,
        customPatcher?: (trampolineAddr: NativePointer, jumpSize: number, hooker: InlineHooker) => [number, ArrayBuffer]
    ) {
        this.targetAddress = targetAddress;
        this.hookFunction = hookFunction;
        this.parameter = parameter;
        this.trampolineAddress = trampolineAddress ?? InlineHooker.allocateTrampolineMemory(defaultTrampolineSize);
        this.customPatcher = customPatcher;
        this.trampolineSize = 0;
    }

    protected abstract generateJumpInstruction(from: NativePointer, to: NativePointer): number;
    protected abstract canJumpDirectly(from: NativePointer, to: NativePointer): boolean;
    protected abstract getJumpInstructionSize(from: NativePointer, to: NativePointer): number;
    protected abstract generatePrologue(address: NativePointer): [number, NativePointer];

    private static readonly MAX_INSTRUCTIONS = 5;
    private static readonly DEFAULT_TRAMPOLINE_SIZE = 0x100;

    protected relocateInstructions(source: NativePointer, destination: NativePointer, size: number): [number, ArrayBuffer] {
        const instructions = source.and(~1).readByteArray(size);
        if (!instructions) throw new Error('Failed to read instructions');
        destination.and(~1).writeByteArray(instructions);
        return [size, instructions];
    }

    public install(): {size: number, originalBytes: ArrayBuffer, debugInfo: string} {
        if (InlineHooker.isAddressHooked(this.targetAddress)) {
            throw new Error(`Address ${this.targetAddress} already hooked`);
        }

        let originalBytes = new ArrayBuffer(0);
        let offset = 0;
        let trampolineCode = ptr(0);

        Memory.patchCode(this.trampolineAddress, InlineHooker.DEFAULT_TRAMPOLINE_SIZE, code => {
            [offset, trampolineCode] = this.generatePrologue(code);
            this.trampolineCode = trampolineCode;
            const jumpSize = this.getJumpInstructionSize(this.targetAddress, trampolineCode);

            if (!this.customPatcher) {
                let relocSize: number;
                [relocSize, originalBytes] = this.relocateInstructions(this.targetAddress, this.trampolineAddress.add(offset), jumpSize);
                offset += relocSize;

                offset += this.generateJumpInstruction(
                    this.trampolineAddress.add(offset),
                    this.targetAddress.add(originalBytes.byteLength)
                );
            } else {
                let customSize: number;
                [customSize, originalBytes] = this.customPatcher(this.trampolineAddress.add(offset), jumpSize, this);
                offset += customSize;
            }
        });

        const jumpSize = this.getJumpInstructionSize(this.targetAddress, trampolineCode);
        Memory.patchCode(this.targetAddress, jumpSize, code => {
            this.generateJumpInstruction(code, trampolineCode);
        });

        InlineHooker.recordHook(
            this.targetAddress,
            this.hookFunction,
            this.trampolineAddress,
            this.trampolineCode,
            originalBytes
        );

        // update trampoline size
        // Align trampoline size to next 4-byte boundary
        const alignment = 4;
        this.trampolineSize = (offset + alignment - 1) & ~(alignment - 1);

        return {
            size: offset,
            originalBytes,
            debugInfo: this.generateDebugInfo(offset, originalBytes)
        };
    }

    private generateDebugInfo(offset: number, originalBytes: ArrayBuffer): string {
        const extraDebugBytes = 0x10; // Additional bytes to dump for debugging
        const trampolineData = this.trampolineAddress.readByteArray(offset + extraDebugBytes) || [];
        const originalCode = this.targetAddress.and(~1).readByteArray(originalBytes.byteLength + extraDebugBytes) || [];
        return `
hook_address = ${this.targetAddress};
hook_function = ${this.hookFunction};
trampoline_address = ${this.trampolineAddress};
trampoline_code_address = ${this.trampolineCode};
original_code = [${Array.from(new Uint8Array(originalCode))}]
trampoline_size = ${offset};
trampoline_data = [${Array.from(new Uint8Array(trampolineData))}];
        `;
    }

    private static trampolinePool = {
        pages: [] as NativePointer[],
        currentPageIndex: -1,
        currentOffset: -1
    };

    private static allocateTrampolineMemory(size: number): NativePointer {
        const pool = InlineHooker.trampolinePool;
        
        if (pool.currentPageIndex >= 0 && pool.currentOffset + size <= Process.pageSize) {
            const address = pool.pages[pool.currentPageIndex].add(pool.currentOffset);
            pool.currentOffset += size;
            return address;
        }

        const newPage = Memory.alloc(Process.pageSize);
        pool.pages.push(newPage);
        pool.currentPageIndex = pool.pages.length - 1;
        pool.currentOffset = size;
        return newPage;
    }

    private static activeHooks: {[key: string]: {
        originalBytes: ArrayBuffer,
        targetAddress: NativePointer,
        hookFunction: NativePointer,
        trampolineAddress: NativePointer,
        trampolineCodeAddress: NativePointer
    }} = {};

    private static isAddressHooked(address: NativePointer): boolean {
        return address.toString() in InlineHooker.activeHooks;
    }

    private static recordHook(
        targetAddress: NativePointer,
        hookFunction: NativePointer,
        trampolineAddress: NativePointer,
        trampolineCodeAddress: NativePointer,
        originalBytes: ArrayBuffer
    ): void {
        InlineHooker.activeHooks[targetAddress.toString()] = {
            originalBytes,
            targetAddress,
            hookFunction,
            trampolineAddress,
            trampolineCodeAddress,
        };
    }

    public static restoreAll(): void {
        Object.values(InlineHooker.activeHooks).forEach(hook => {
            Memory.patchCode(hook.targetAddress, hook.originalBytes.byteLength, code => {
                code.writeByteArray(hook.originalBytes);
            });
        });
    }

    public static restore(address: NativePointer): void {
        const hook = InlineHooker.activeHooks[address.toString()];
        if (hook) {
            Memory.patchCode(hook.targetAddress.and(~1), hook.originalBytes.byteLength, code => {
                code.writeByteArray(hook.originalBytes);
            });
        }
    }
}

