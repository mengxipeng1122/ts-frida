
'use strict';


namespace MyFrida {

export const inlineHookerFactory = (
    hook_ptr:NativePointer, 
    hook_fun_ptr:NativePointer, 
    para1: NativePointer, 
    trampoline_ptr?:NativePointer, 
    cb_patch?:CUSTOM_PATCHER,
): InlineHooker => {
    let arch = Process.arch;
    if(arch == 'arm') {
        if(hook_ptr.and(1).toInt32() == 1) {
            console.log('use ThumbInlineHooker')
            return new ThumbInlineHooker(hook_ptr, hook_fun_ptr, para1, trampoline_ptr, cb_patch)
        }
        else {
            console.log('use ArmInlineHooker')
            return new ArmInlineHooker(hook_ptr, hook_fun_ptr, para1, trampoline_ptr, cb_patch)
        }
    }
    else if(arch == 'arm64'){
        console.log('use Arm64InlineHooker')
        return new Arm64InlineHooker(hook_ptr,hook_fun_ptr, para1, trampoline_ptr, cb_patch)
    }
    else if(arch == 'ia32'){
        console.log('use X86InlineHooker')
        return new X86InlineHooker(hook_ptr,hook_fun_ptr, para1,trampoline_ptr, cb_patch)
    }
    else if(arch == 'x64'){
        console.log('use X64InlineHooker')
        return new X64InlineHooker(hook_ptr,hook_fun_ptr, para1,trampoline_ptr, cb_patch)
    }
    else{
        throw `unhandle architecture ${arch}`
    }
}

export const inlineHookPatch = (
    hook_ptr:NativePointer, 
    hook_fun_ptr:NativePointer, 
    para1:NativePointer, 
    trampoline_ptr?:NativePointer, 
    cb_patch?:CUSTOM_PATCHER,
) => {
    let inlineHooker = inlineHookerFactory(hook_ptr, hook_fun_ptr, para1, trampoline_ptr, cb_patch);
    let {size:trampoline_len, originalBytes, debugInfo} = inlineHooker.install();
    return {trampoline_len, originalBytes, debugInfo};
}

}