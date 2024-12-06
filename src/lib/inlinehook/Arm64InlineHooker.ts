
'use strict';

import { InlineHooker } from "./InlineHooker.js";

export class Arm64InlineHooker extends InlineHooker {
    generatePrologue(p: NativePointer): [number, NativePointer] {
        let offset=0;
        // write hook_fun_ptr
        p.add(offset).writePointer(this.hookFunction); 
        offset += Process.pointerSize;
        // write arg1
        p.add(offset).writePointer(this.parameter); 
        offset += Process.pointerSize;

        let trampolineCodeAddr = p.add(offset);
        const writer = new Arm64Writer(trampolineCodeAddr);
        writer.putPushAllXRegisters();                            
        writer.putMovRegReg('x1','sp');                         
        writer.putBytes([ 0x80, 0xfd, 0xff, 0x58]);    // 0x58: ldr    x0, trampoline_ptr.add(0x08)
        writer.putBytes([ 0x29, 0xfd, 0xff, 0x58]);    // 0x5c: ldr    x9, trampoline_ptr.add(0x00)
        writer.putBlrReg('x9');                                         
        writer.putPopAllXRegisters();                             
        writer.flush();
        offset += writer.offset;
        return [offset, trampolineCodeAddr];
    }

    generateJumpInstruction(from: NativePointer, to: NativePointer): number {
        const writer = new Arm64Writer(from);
        if(this.canJumpDirectly(from,to)){
            writer.putBImm(to);
            writer.flush();
            return writer.offset;
        }
        else{
            writer.putBytes([ 0x50, 0x00, 0x00, 0x58]);    // ldr x16, #8
            writer.putBrReg('x16');
            writer.flush();
            from.add(writer.offset).writePointer(to);
            return writer.offset+Process.pointerSize;
        }
    }

    canJumpDirectly(from: NativePointer, to: NativePointer): boolean {
        return new Arm64Writer(ptr(0)).canBranchDirectlyBetween(from, to);
    }

    getJumpInstructionSize(from: NativePointer, to: NativePointer): number {
        if(this.canJumpDirectly(from, to)) return 4;
        else return 0x10;
    }



    static getRegs = (sp: NativePointer) => {
        return {
        NZCV   :sp.add(Process.pointerSize*1 ).readPointer(),
        X30    :sp.add(Process.pointerSize*0 ).readPointer(),
        X29    :sp.add(Process.pointerSize*3 ).readPointer(),
        X28    :sp.add(Process.pointerSize*2 ).readPointer(),
        X27    :sp.add(Process.pointerSize*5 ).readPointer(),
        X26    :sp.add(Process.pointerSize*4 ).readPointer(),
        X25    :sp.add(Process.pointerSize*7 ).readPointer(),
        X24    :sp.add(Process.pointerSize*6 ).readPointer(),
        X23    :sp.add(Process.pointerSize*9 ).readPointer(),
        X22    :sp.add(Process.pointerSize*8 ).readPointer(),
        X21    :sp.add(Process.pointerSize*11).readPointer(),
        X20    :sp.add(Process.pointerSize*10).readPointer(),
        X19    :sp.add(Process.pointerSize*13).readPointer(),
        X18    :sp.add(Process.pointerSize*12).readPointer(),
        X17    :sp.add(Process.pointerSize*15).readPointer(),
        X16    :sp.add(Process.pointerSize*14).readPointer(),
        X15    :sp.add(Process.pointerSize*17).readPointer(),
        X14    :sp.add(Process.pointerSize*16).readPointer(),
        X13    :sp.add(Process.pointerSize*19).readPointer(),
        X12    :sp.add(Process.pointerSize*18).readPointer(),
        X11    :sp.add(Process.pointerSize*21).readPointer(),
        X10    :sp.add(Process.pointerSize*20).readPointer(),
        X9     :sp.add(Process.pointerSize*23).readPointer(),
        X8     :sp.add(Process.pointerSize*22).readPointer(),
        X7     :sp.add(Process.pointerSize*25).readPointer(),
        X6     :sp.add(Process.pointerSize*24).readPointer(),
        X5     :sp.add(Process.pointerSize*27).readPointer(),
        X4     :sp.add(Process.pointerSize*26).readPointer(),
        X3     :sp.add(Process.pointerSize*29).readPointer(),
        X2     :sp.add(Process.pointerSize*28).readPointer(),
        X1     :sp.add(Process.pointerSize*31).readPointer(),
        X0     :sp.add(Process.pointerSize*30).readPointer(),
    };
}

}

