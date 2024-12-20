
'use strict';

import { InlineHooker } from "./InlineHooker.js";

export class X86InlineHooker extends InlineHooker {
    generatePrologue(p: NativePointer): [number, NativePointer] {
        const writer = new X86Writer(p);
        writer.putPushfx();
        writer.putPushReg('eax');
        writer.putPushReg('ecx'); 
        writer.putPushReg('edx');
        writer.putPushReg('ebx');
        writer.putPushReg('ebp');
        writer.putPushReg('esi');
        writer.putPushReg('edi');
        writer.putMovRegReg('ecx','esp');
        writer.putMovRegAddress('edx', this.parameter);
        writer.putCallAddress(this.hookFunction)
        writer.putPopReg('edi');
        writer.putPopReg('esi');
        writer.putPopReg('ebp');
        writer.putPopReg('ebx');
        writer.putPopReg('edx');
        writer.putPopReg('ecx');
        writer.putPopReg('eax');
        writer.putPopfx();
        writer.flush()
        return [writer.offset, p];
    }

    getJumpInstructionSize(from: NativePointer, to: NativePointer): number {
        return 5; // always jmp
    }

    generateJumpInstruction(from: NativePointer, to: NativePointer): number {
        const writer = new X86Writer(from);
        writer.putJmpAddress(to);
        writer.flush();
        return writer.offset;
    }

    canJumpDirectly(from: NativePointer, to: NativePointer): boolean {
        return true; // x86 can always jump directly with 5-byte jmp
    }


    static getRegs = (sp: NativePointer) => {
        return {
            flag: sp.add(Process.pointerSize * 7).readPointer(),
            eax: sp.add(Process.pointerSize * 6).readPointer(),
            ecx: sp.add(Process.pointerSize * 5).readPointer(),
            edx: sp.add(Process.pointerSize * 4).readPointer(),
            ebx: sp.add(Process.pointerSize * 3).readPointer(),
            ebp: sp.add(Process.pointerSize * 2).readPointer(),
            esi: sp.add(Process.pointerSize * 1).readPointer(),
            edi: sp.add(Process.pointerSize * 0).readPointer(),
        };
    }
}
