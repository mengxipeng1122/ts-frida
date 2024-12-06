
'use strict';


import { InlineHooker } from "./InlineHooker.js";

export class ArmInlineHooker extends InlineHooker{

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
        console.log(`prePrecode at ${p} in Arm mode`);
        const writer = new ArmWriter(p);
        writer.putBytes([ 0xFF, 0x00, 0x2D, 0xE9 ]); // push {r0-r7};                  
        writer.putBytes([ 0x00, 0x5F, 0x2D, 0xE9 ]); // push {r8-r12, r14};
        writer.putMovRegCpsr('r0');
        writer.putBytes([ 0x04, 0x00, 0x2D, 0xE5 ]); // push {r0};
        writer.putMovRegReg('r1','sp');
        writer.putLdrRegRegOffset('r0','pc',-0x20);
        writer.putLdrRegRegOffset('r4','pc',-0x28);
        writer.putBlxReg('r4')
        writer.putBytes([ 0x04, 0x00, 0x9D, 0xE4 ]); // pop {r0};
        writer.putMovCpsrReg('r0');
        writer.putBytes([ 0x00, 0x5f, 0xBD, 0xE8 ]); // pop {r8-r12, r14};
        writer.putBytes([ 0xFF, 0x00, 0xBD, 0xE8 ]); // pop {r0-r7};
        writer.flush();
        let sz = writer.offset;
        offset += sz;

        return [offset, trampolineCodeAddr];
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
        let code = from;
        const writer = new ArmWriter(code);
        if (this.canJumpDirectly(from, to)) {
            writer.putBImm(to);
            writer.flush();
            return writer.offset;
        }
        else {
            writer.putLdrRegRegOffset('pc', 'pc', -4);
            writer.flush();
            from.add(writer.offset).writePointer(to)
            return writer.offset + Process.pointerSize;
        }
    }

    static getRegs = (sp: NativePointer) => {
        return {
        r0      : sp.add(Process.pointerSize*7 ).readPointer(),
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
