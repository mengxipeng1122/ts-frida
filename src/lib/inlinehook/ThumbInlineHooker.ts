

'use strict';

import { InlineHooker } from "./InlineHooker.js";

export class ThumbInlineHooker extends InlineHooker{

    generatePrologue(p:NativePointer):[number, NativePointer] {
        let offset=0;
        // write hook_fun_ptr
        p.add(offset).writePointer(this.hookFunction); 
        offset += Process.pointerSize;
        // write arg1
        p.add(offset).writePointer(this.parameter); 
        offset += Process.pointerSize;
        // write precode
        let trampolineCodeAddr = p.add(offset);
        console.log(`prePrecode at ${trampolineCodeAddr}`);
        const writer = new ThumbWriter(trampolineCodeAddr);
        writer.putPushRegs([ 'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', ])
        writer.putPushRegs(['r8', 'r9', 'r10', 'r11', 'r12', 'r14'] )
        writer.putMrsRegReg('r0','apsr-nzcvq')
        writer.putPushRegs([ 'r0'])
        writer.putNop();
        writer.putMovRegReg('r1', 'sp')
        writer.putBytes([ 0x5F, 0xF8, 0x18, 0x00]) // ldr.w r0, [pc, #-0x18]
        writer.putBytes([ 0x5F, 0xF8, 0x20, 0x40]) // ldr.w r4, [pc, #-0x20]
        writer.putBlxReg('r4')
        writer.putPopRegs(['r0'])
        writer.putMsrRegReg('apsr-nzcvq','r0')
        writer.putNop();
        writer.putPopRegs(['r8', 'sb', 'sl', 'fp', 'ip', 'lr'] )
        writer.putPopRegs([ 'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7' ])
        writer.flush();
        let sz = writer.offset;
        offset += sz;

        return [offset, trampolineCodeAddr]
    }

    canJumpDirectly(from:NativePointer, to:NativePointer):boolean {
        let distance = to.or(1).sub(from.or(1)).toInt32();
        return distance >=-8388608 && distance<= 8388607;
    }

    getJumpInstructionSize(from:NativePointer, to:NativePointer):number{
        if(this.canJumpDirectly(from, to)) return 4;
        else return 8;
    }

    generateJumpInstruction(from:NativePointer, to:NativePointer):number {
        let code = from.and(~1);
        const writer = new ThumbWriter(code);
        if (this.canJumpDirectly(from, to)) {
            writer.putBImm(to.or(1))
            writer.flush();
            return writer.offset;
        }
        else {
            if (!code.and(0x3).equals(0)) {
                writer.putNop();
            }
            writer.putLdrRegRegOffset('pc', 'pc', 0)
            writer.flush()
            code.add(writer.offset).writePointer(to.or(1))
            return writer.offset + Process.pointerSize;
        }
    }


    static getRegs = (sp: NativePointer) => {
        return {
            r0      : sp.add(Process.pointerSize * 7).readPointer(),
            r1      : sp.add(Process.pointerSize*8 ).readPointer(),
            r2      : sp.add(Process.pointerSize*9 ).readPointer(),
            r3      : sp.add(Process.pointerSize*10).readPointer(),
            r4      : sp.add(Process.pointerSize*11).readPointer(),
            r5      : sp.add(Process.pointerSize*12).readPointer(),
            r6      : sp.add(Process.pointerSize*13).readPointer(),
            r7      : sp.add(Process.pointerSize*14).readPointer(),
            r8      : sp.add(Process.pointerSize*1 ).readPointer(),
            r9      : sp.add(Process.pointerSize*2 ).readPointer(),
            r10     : sp.add(Process.pointerSize*3 ).readPointer(),
            r11     : sp.add(Process.pointerSize*4 ).readPointer(),
            r12     : sp.add(Process.pointerSize*5 ).readPointer(),
            r14     : sp.add(Process.pointerSize*6 ).readPointer(),
            apsr    : sp.add(Process.pointerSize*0 ).readPointer(),
        };
    }

}
