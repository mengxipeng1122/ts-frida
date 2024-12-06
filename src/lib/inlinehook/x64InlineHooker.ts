'use strict';

import { InlineHooker } from "./InlineHooker.js";

const G_MININT32 = -2147483648;
const G_MAXINT32 = 2147483647;

export class X64InlineHooker extends InlineHooker {
    generatePrologue(p: NativePointer): [number, NativePointer] {
        const writer = new X86Writer(p);
        writer.putPushfx();
        writer.putPushReg('r15');
        writer.putPushReg('r14');
        writer.putPushReg('r13');
        writer.putPushReg('r12');
        writer.putPushReg('r11');
        writer.putPushReg('r10');
        writer.putPushReg('r9');
        writer.putPushReg('r8');
        writer.putPushReg('rax');
        writer.putPushReg('rcx');
        writer.putPushReg('rdx');
        writer.putPushReg('rbx');
        writer.putPushReg('rbp');
        writer.putPushReg('rsi');
        writer.putPushReg('rdi');
        writer.putMovRegReg('rsi','rsp');
        writer.putMovRegAddress('rdi', this.parameter);
        writer.putCallAddress(this.hookFunction)
        writer.putPopReg('rdi');
        writer.putPopReg('rsi');
        writer.putPopReg('rbp');
        writer.putPopReg('rbx');
        writer.putPopReg('rdx');
        writer.putPopReg('rcx');
        writer.putPopReg('rax');
        writer.putPopReg('r8');
        writer.putPopReg('r9');
        writer.putPopReg('r10');
        writer.putPopReg('r11');
        writer.putPopReg('r12');
        writer.putPopReg('r13');
        writer.putPopReg('r14');
        writer.putPopReg('r15');
        writer.putPopfx();
        writer.flush()
        return [ writer.offset, p];
    }

    generateJumpInstruction(from: NativePointer, to: NativePointer): number {
        const writer = new X86Writer(from);
        writer.putJmpAddress(to);
        writer.flush();
        return writer.offset;
    }

    canJumpDirectly(from: NativePointer, to: NativePointer): boolean {
        let distance = to.sub(from.add(5));
        return distance.compare(G_MININT32) >= 0 && distance.compare(G_MAXINT32) < 0;
    }

    getJumpInstructionSize(from: NativePointer, to: NativePointer): number {
        let distance = to.sub(from.add(5));
        if (distance.compare(G_MININT32)>=0 && distance.compare(G_MAXINT32)<0) return 5;
        else return 0x10;
    }

        static getRegs = (sp: NativePointer) => {
            return {
                flag: sp.add(Process.pointerSize * 15).readPointer(),
                r15: sp.add(Process.pointerSize * 14).readPointer(),
                r14: sp.add(Process.pointerSize * 13).readPointer(),
                r13: sp.add(Process.pointerSize * 12).readPointer(),
                r12: sp.add(Process.pointerSize * 11).readPointer(),
                r11: sp.add(Process.pointerSize * 10).readPointer(),
                r10: sp.add(Process.pointerSize * 9).readPointer(),
                r9: sp.add(Process.pointerSize * 8).readPointer(),
                r8: sp.add(Process.pointerSize * 7).readPointer(),
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
