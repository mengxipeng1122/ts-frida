

namespace MyFrida {


const checkAndroidPlatform = ()=>{
    if(Process.platform!='linux' || !Java.available) throw new Error(`It seems this process is not on Android platform, please check you configruations`)
}

export const JavaCast=(o:Java.Wrapper, clz:Java.Wrapper|string) : Java.Wrapper<{}>=>{
    if(typeof clz=='string'){ clz = Java.use(clz); }
    return Java.cast(o, clz)
}

export const getRootView = (activity: any): any => {
    const window = activity.getWindow();
    const decorView = window.getDecorView();
    const rootView = decorView.getRootView();
    return rootView;
}


export const enumerateSubviews = (view: any, depth: number, cb: (view: any, depth: number) => void): void => {
    cb(view, depth);

    let viewGroup = JavaCast(view, 'android.view.ViewGroup');
    if (viewGroup == null) return;
    const childCount = viewGroup.getChildCount();

    for (let i = 0; i < childCount; i++) {
        const child = viewGroup.getChildAt(i);
        enumerateSubviews(child, depth + 1, cb);
    }
}

export const hasMemberFunction = (className: string, functionName: string): boolean => {
    const classObj = Java.use(className);
    const hasFunction = classObj.hasOwnProperty(functionName) && typeof classObj[functionName] === 'function';
    return hasFunction;
}


export const getViewText = (view: any): string | null => {
    const className = view.getClass().getName();
    let text = null;
    if(hasMemberFunction(className,'getText')){
        let viewText = JavaCast(view, className);
        if(viewText!=null){
            text = viewText.getText().toString();
        }
    }
    return text;
}


export const getViewSize = (view: any): {width: number, height: number} => {
    const className = view.getClass().getName();
    view = JavaCast(view, className)
    const width = view.getWidth();
    const height = view.getHeight();
    return {width, height};
}

/**
 * Get the screen position of a view
 * @param view the Android view to get the position of
 * @returns an object containing the x and y coordinates of the view on the screen
 */
export const getViewScreenPosition = (view: any): {x: number, y: number} => {
    const className = view.getClass().getName();
    view = JavaCast(view, className)
    const location = view.getLocationOnScreen();
    const x = location[0];
    const y = location[1];
    return { x, y };
}

export const enumerateChildrenView=(v:Java.Wrapper, f:(v:Java.Wrapper)=>void) => {
    f(v)
    let ViewGroup = Java.use('android.view.ViewGroup')
    let vv = JavaCast(v,ViewGroup);
    if(vv!=null) 
    {
        let chileCount = vv.getChildCount()
        if(chileCount>0){
            for (let i=0;i<vv.getChildCount();i++) {
                let v1 = vv.getChildAt(i);
                enumerateChildrenView(v1,f)
            }
        }
    }
}

export const getExternalStorageDirectory  = ()=>{
    return Java.use('android.os.Environment').getExternalStorageDirectory().getAbsolutePath().toString();
}

export const androidAppInfo = ()=>{
    const ActivityThread = Java.use('android.app.ActivityThread');
    var currentApplication = ActivityThread.currentApplication();
    var context = currentApplication.getApplicationContext();

//    (globalThis as any). console.log('   applicationName               '      , context.getPackageName().toString()                                             );      
//    (globalThis as any). console.log('   packageCodePath               '      , context.getPackageCodePath                 ()                                   );
//    (globalThis as any). console.log('   packageResourcePath           '      , context.getPackageResourcePath             ()                                   );
//    (globalThis as any). console.log('   cacheDir                      '      , context.getCacheDir                        ()?.getAbsolutePath().toString(),    );
//    (globalThis as any). console.log('   codeCacheDir                  '      , context.getCodeCacheDir                    ()?.getAbsolutePath().toString(),    );
//    (globalThis as any). console.log('   dataDir                       '      , context.getDataDir                         ()?.getAbsolutePath().toString(),    );
//    (globalThis as any). console.log('   externalCacheDir              '      , context.getExternalCacheDir                ()?.getAbsolutePath().toString(),    );
//    (globalThis as any). console.log('   externalFilesDir              '      , context.getExternalFilesDir            (null)?.getAbsolutePath().toString(),    );
//    (globalThis as any). console.log('   filesDir                      '      , context.getFilesDir                        ()?.getAbsolutePath().toString(),    );
//    (globalThis as any). console.log('   noBackupFilesDir              '      , context.getNoBackupFilesDir                ()?.getAbsolutePath().toString(),    );
//    (globalThis as any). console.log('   obbDir                        '      , context.getObbDir                          ()?.getAbsolutePath().toString(),    );
    
    return {
        applicationName                      : context.getPackageName().toString(),
        packageCodePath                      : context.getPackageCodePath                 (),
        packageResourcePath                  : context.getPackageResourcePath             (),
        cacheDir                             : context.getCacheDir                        ()?.getAbsolutePath().toString(),
        codeCacheDir                         : context.getCodeCacheDir                    ()?.getAbsolutePath().toString(),
        dataDir                              : context.getDataDir                         ()?.getAbsolutePath().toString(),
        externalCacheDir                     : context.getExternalCacheDir                ()?.getAbsolutePath().toString(),
        externalFilesDir                     : context.getExternalFilesDir            (null)?.getAbsolutePath().toString(),
        filesDir                             : context.getFilesDir                        ()?.getAbsolutePath().toString(),
        noBackupFilesDir                     : context.getNoBackupFilesDir                ()?.getAbsolutePath().toString(),
        obbDir                               : context.getObbDir                          ()?.getAbsolutePath().toString(),
    };
}

export const getLastInstanceOfClass = (className: string): any => {
    let lastInstance = null;
      const classLoader = Java.classFactory.loader;
      if (classLoader==null) return lastInstance;
      const classes = classLoader.enumerateLoadedClassesSync();
      for (const c of classes) {
        if (c.endsWith(className)) {
          try {
            const classInstance = Java.use(c);
            const instances = classInstance.$instances;
            if (instances.length > 0) {
              lastInstance = instances[instances.length - 1];
              break;
            }
          } catch (e) {}
        }
      }
    return lastInstance;
}
  

export const getCurrentActivityClassName=() => {
    const ActivityThread = Java.use('android.app.ActivityThread');
    let RunningTaskInfo =  Java.use('android.app.ActivityManager$RunningTaskInfo')
    var currentApplication = ActivityThread.currentApplication();
    var context = currentApplication.getApplicationContext();
    let amc = context.getSystemService('activity')
    let am = JavaCast(amc,Java.use('android.app.ActivityManager'))
    if(am==null) return null;
    let tasks = am.getRunningTasks(999)
    if(tasks.size()<=0) return null;
    let task = JavaCast(tasks.get(0), RunningTaskInfo);
    if(task == null) return null;
    return task.topActivity.value.getClassName();
}

export const hookRegisterNatives = (clzname?:string, soname?:string, handles?:{[key:string]:InvocationListenerCallbacks}):void=>{
    var addrRegisterNatives:NativePointer ;
    const module = Process.findModuleByName("libart.so");
    if(module){
        module.enumerateSymbols()
            .forEach(symbol=>{
            //_ZN3art3JNI15RegisterNativesEP7_JNIEnvP7_jclassPK15JNINativeMethodi
            if (symbol.name.indexOf("art") >= 0 &&
                symbol.name.indexOf("JNI") >= 0 && 
                symbol.name.indexOf("RegisterNatives") >= 0 && 
                symbol.name.indexOf("CheckJNI") < 0) {
                addrRegisterNatives = symbol.address;
                (globalThis as any). console.log("RegisterNatives is at ", symbol.address, symbol.name);
                Interceptor.attach(addrRegisterNatives,{
                    onEnter:function(args){
                        var env = args[0];
                        var java_class = args[1];
                        var class_name = Java.vm.tryGetEnv().getClassName(java_class);
                        var methods_ptr = args[2];
                        var method_count = args[3].toUInt32();
                        (globalThis as any). console.log('call RegisterNatives', args[0], args[1], args[2], args[3], args[4],)
                        (globalThis as any). console.log("this", JSON.stringify(this))
                        dumpMemory(this.context.sp, 0x50)
                        if(true){
                            if(soname!=undefined)
                            {
                                let m = Process.getModuleByName(soname);
                                (globalThis as any). console.log(JSON.stringify(m))
                                let sp = this.context.sp;
                                for(let t=0; t<40;t++){
                                    let pp = sp.add(t*Process.pointerSize).readPointer();
                                    if(pp.compare(m.base)>=0 && pp.compare(m.base.add(m.size)) <0){
                                        (globalThis as any). console.log(t, pp, pp.sub(m.base))
                                    }
                                }
                            }
                        }
                        for (var i = 0; i < method_count; i++) {
                            var name = methods_ptr.add(i*Process.pointerSize*3+0x00).readPointer().readCString();
                            var sig = methods_ptr.add(i*Process.pointerSize*3+Process.pointerSize).readPointer().readUtf8String();
                            var fnPtr_ptr = methods_ptr.add(i * Process.pointerSize * 3 + Process.pointerSize * 2).readPointer();
                            var find_module=Process.findModuleByAddress(fnPtr_ptr);
                            if(clzname){
                                if(class_name.includes(clzname)){
                                    (globalThis as any). console.log("[RegisterNatives] java_class:", class_name, "name:", name, "sig:", sig, "fnPtr:", fnPtr_ptr, JSON.stringify(find_module));
                                    if(name && handles!=undefined){
                                        if (Object.keys(handles).indexOf(name)>=0){
                                            let h = handles[name]
                                            if(h){
                                                Interceptor.attach(fnPtr_ptr,h);
                                                (globalThis as any). console.log(name,'attached');
                                            }
                                        }
                                    }
                                }
                            }
                            else{
                                if (soname!=undefined){
                                    let m = Process.getModuleByName(soname);
                                    (globalThis as any). console.log("[RegisterNatives] java_class:", class_name, "name:", name, "sig:", sig, "fnPtr:", fnPtr_ptr, 'offset', fnPtr_ptr.sub(m.base));
                                }
                                else{
                                    (globalThis as any). console.log("[RegisterNatives] java_class:", class_name, "name:", name, "sig:", sig, "fnPtr:", fnPtr_ptr);
                                }
                            }
                        }
                    },
                    onLeave:(retval)=>{},
                });
            }
        })
        return ;
    }
    (globalThis as any). console.log('can not found RegisterNativates function')
}

export const copyfile = (fn: string, dfn:string):void=>{
    const File = Java.use('java.io.File');
    const FileInputStream = Java.use('java.io.FileInputStream');
    const FileOutputStream = Java.use('java.io.FileOutputStream');
    const BufferedInputStream = Java.use('java.io.BufferedInputStream');
    const BufferedOutputStream = Java.use('java.io.BufferedOutputStream');
    var sourceFile = File.$new.overload('java.lang.String').call(File, fn);
    if (sourceFile.exists() && sourceFile.canRead()) {
        var destinationFile = File.$new.overload('java.lang.String').call(File, dfn);
        destinationFile.createNewFile();
        var fileInputStream = FileInputStream.$new.overload('java.io.File').call(FileInputStream, sourceFile);
        var fileOutputStream = FileOutputStream.$new.overload('java.io.File').call(FileOutputStream, destinationFile);
        var bufferedInputStream = BufferedInputStream.$new.overload('java.io.InputStream').call(BufferedInputStream, fileInputStream);
        var bufferedOutputStream = BufferedOutputStream.$new.overload('java.io.OutputStream').call(BufferedOutputStream, fileOutputStream);
        var data = 0;
        while ((data = bufferedInputStream.read()) != -1) {
            bufferedOutputStream.write(data);
        }
        bufferedInputStream.close();
        fileInputStream.close();
        bufferedOutputStream.close();
        fileOutputStream.close();
    }
    else {
        (globalThis as any). console.log('Error : File cannot read.')
    }
}

export const listAllAssetFiles = ():void=>{
    const listAssetFiles = (assets_manager:any, path:string)=> {
        try{
            let assetsList = assets_manager.list(path) as Array<string>;
            if(assetsList.length==0){
                // is a file
                let f = assets_manager.open(path);
                (globalThis as any). console.log('path', path, f.available());
                //let bufflen = 0x1000;
                //let  buffer = Java.array('byte', new Array(bufflen).fill(0));
                //let memory = Memory.alloc(bufflen);
                //let x;
                //while ((x = f.read(buffer)) != -1) {
                //    for(let t = 0;t<x;t++){
                //        memory.add(t).writeS8(buffer[t]);
                //    }
                //    fridautils.dumpMemory(memory)
                //    (globalThis as any). console.log(x);
                //}
                f.close();
            }
            assetsList.forEach(e => {
                let newpath;
                if(path=='') newpath=e
                else newpath=path+'/'+e;
                listAssetFiles(assets_manager,newpath)
            });
        }
        catch(e){
            // path is a file
            (globalThis as any). console.log(e);
        }
        // (globalThis as any). console.log('asserts', JSON.stringify(assetsList))
    }
    let current_application = Java.use('android.app.ActivityThread').currentApplication();
    var context = current_application.getApplicationContext();
    (globalThis as any). console.log('current_appliction', current_application);
    let assets_manager = context.getAssets();
    listAssetFiles(assets_manager,'');
}


export const getApkInfo = () => {
    let current_application = Java.use('android.app.ActivityThread').currentApplication();
    var context = current_application.getApplicationContext();
    let packageName=context.getPackageName();
    let pm = context.getPackageManager();
    let ai = pm.getApplicationInfo(packageName,0);
    let apkPath = ai.publicSourceDir;
    let dataPath = ai.dataDir;
    return {
        packageName : packageName,
        apkPath : apkPath,
        dataPath : dataPath,

    }
}

export const androidOutput = (s:string) => {
    checkAndroidPlatform();
    let funp = Module.getExportByName(null,'__android_log_print')
    let fun = new NativeFunction(funp, 'int',['int','pointer','pointer'])
    fun(0, Memory.allocUtf8String("frida"), Memory.allocUtf8String(s))
}

export const androidExit = (exitCode?:number) =>{
    checkAndroidPlatform();
    const Process = Java.use('android.os.Process');
    const System = Java.use('java.lang.System')
    Process.killProcess(Process.myPid())
    if(exitCode==undefined) exitCode = -9;
    System.exit(exitCode)
}
export type AndroidSOINFO = {
name                : string,        
phdr                : NativePointer, 
phnum               : number,        
entry               : NativePointer, 
base                : NativePointer, 
size                : number,
dynamic             : NativePointer, 
next                : NativePointer, 
flags               : number,
strtab              : NativePointer, 
symtab              : NativePointer, 
nbucket             : number,
nchain              : number,
bucket              : NativePointer, 
chain               : NativePointer, 
plt_got             : NativePointer, 
plt_rel             : NativePointer, 
plt_rel_count       : NativePointer, 
rel                 : NativePointer, 
rel_count           : number,
preinit_array       : NativePointer, 
preinit_array_count : NativePointer, 
init_array          : NativePointer, 
init_array_count    : number,
fini_array          : number,
fini_array_count    : NativePointer, 
init_func           : NativePointer, 
fini_func           : NativePointer, 
ARM_exidx           : NativePointer, 
ARM_exidx_count     : number,
ref_count           : NativePointer, 
link_map : {
    l_addr     : NativePointer, 
    l_name     : string       ,
    l_ld       : NativePointer, 
    l_next     : NativePointer, 
    l_prev     : NativePointer, 

};
constructors_called : boolean,
load_bias           : NativePointer, 
has_text_relocations: boolean,
has_DT_SYMBOLIC     : boolean,

};

export const parseSoInfo = (p: NativePointer): AndroidSOINFO=> { 
    let info: any = {};
    let offset = 0;

info.name                = p.add(offset).readUtf8String()         ; offset += 0x80;
info.phdr                = p.add(offset).readPointer()            ; offset += 0x04;
info.phnum               = p.add(offset).readU32()                ; offset += 0x04;
info.entry               = p.add(offset).readPointer()            ; offset += 0x04;
info.base                = p.add(offset).readPointer()            ; offset += 0x04;
info.size                = p.add(offset).readU32()                ; offset += 0x08;
info.dynamic             = p.add(offset).readPointer()            ; offset += 0x0c;
info.next                = p.add(offset).readPointer()            ; offset += 0x04;
info.flags               = p.add(offset).readU32()                ; offset += 0x04;
info.strtab              = p.add(offset).readPointer()            ; offset += 0x04;
info.symtab              = p.add(offset).readPointer()            ; offset += 0x04;
info.nbucket             = p.add(offset).readU32()                ; offset += 0x04;
info.nchain              = p.add(offset).readU32()                ; offset += 0x04;
info.bucket              = p.add(offset).readPointer()            ; offset += 0x04;
info.chain               = p.add(offset).readPointer()            ; offset += 0x04;
info.plt_got             = p.add(offset).readPointer()            ; offset += 0x04;
info.plt_rel             = p.add(offset).readPointer()            ; offset += 0x04;
info.plt_rel_count       = p.add(offset).readU32()                ; offset += 0x04;
info.rel                 = p.add(offset).readPointer()            ; offset += 0x04;
info.rel_count           = p.add(offset).readU32()                ; offset += 0x04;
info.preinit_array       = p.add(offset).readPointer()            ; offset += 0x04;
info.preinit_array_count = p.add(offset).readU32()                ; offset += 0x04;
info.init_array          = p.add(offset).readPointer()            ; offset += 0x04;
info.init_array_count    = p.add(offset).readU32()                ; offset += 0x04;
info.fini_array          = p.add(offset).readPointer()            ; offset += 0x04;
info.fini_array_count    = p.add(offset).readU32()                ; offset += 0x04;
info.init_func           = p.add(offset).readPointer()            ; offset += 0x04;
info.fini_func           = p.add(offset).readPointer()            ; offset += 0x04;
//#if defined(ANDROID_ARM_LINKER)
//  // ARM EABI section used for stack unwinding.
info.ARM_exidx           = p.add(offset).readPointer()            ; offset +=  0x04;
info.ARM_exidx_count     = p.add(offset).readU32()                ; offset +=  0x04;
//#elif defined(ANDROID_MIPS_LINKER)
//  unsigned mips_symtabno;
//  unsigned mips_local_gotno;
//  unsigned mips_gotsym;
//#endif
//              
info.ref_count           = p.add(offset).readPointer()            ; offset += 0x04;
info.link_map = {};
info.link_map.l_addr     = p.add(offset).readPointer()            ; offset += 0x04;
info.link_map.l_name     = p.add(offset).readPointer().readUtf8String()            ; offset += 0x04;
info.link_map.l_ld       = p.add(offset).readPointer()            ; offset += 0x04;
info.link_map.l_next     = p.add(offset).readPointer()            ; offset += 0x04;
info.link_map.l_prev     = p.add(offset).readPointer()            ; offset += 0x04;
info.constructors_called = p.add(offset).readU8()                 ; offset += 0x04;
info.load_bias           = p.add(offset).readPointer()            ; offset += 0x04;
//dumpMemory(p.add(offset))
info.has_text_relocations= p.add(offset).readU8()                 ; offset += 0x01;
info.has_DT_SYMBOLIC     = p.add(offset).readU8()                 ; offset += 0x01;
    return {...info};
}


export const printJavaTraceStack = ()=>{
    (globalThis as any). console.log(Java.use("android.util.Log").getStackTraceString(Java.use("java.lang.Exception").$new()))
}

export const convertByteArrayToString = (ret:any)=>{
    var buffer = Java.array('byte', ret);
    var result = "";
    for(var i = 0; i < buffer.length; ++i){
        result += (String.fromCharCode(buffer[i] & 0xff)); // here!!
    }
    return result;
}

export const describeJavaClassName = (className:string)=> {
    var jClass = Java.use(className);
    describeJavaClass(jClass)
}


export const describeJavaClass = (jClass:any)=> {
    (globalThis as any). console.log('jClass', jClass, JSON.stringify(jClass));
    (globalThis as any). console.log(JSON.stringify({
        _all_methods: Object.getOwnPropertyNames(jClass.__proto__).filter(m => {
          return !m.startsWith('$') // filter out Frida related special properties
             || m == 'class' || m == 'constructor' // optional
        }),
        _methods: jClass.class.getDeclaredMethods().map((m: any) => {
            return m.toString();
        }),
        _fields: jClass.class.getFields().map((f: any) => {
            return f.toString()
        }),
        name: jClass.toString(),
    }, null, 2));
}

export const showLoaders = () =>{
    Java.enumerateClassLoaders({
        onMatch:function(loader){
            (globalThis as any). console.log('loader', loader)
        },
        onComplete:function(){},
    })
}

export const showJavaClasses = ()=>{
    Java.enumerateLoadedClasses({
        onMatch(name, handle) {
            (globalThis as any). console.log('name', name, handle)
            
        },
        onComplete() {
            
        },
    })
}


export const dumpHashMap = (hs:any, show?:boolean): {[key:string]:string} => {

    show = show??true;
    let m :{[key:string]:string}  =  {}
    if(hs==null) return m;

    (globalThis as any). console.log('hs0', hs, JSON.stringify(hs));
    hs = JavaCast(hs, getClassName(hs));
    (globalThis as any). console.log('hs1', hs, JSON.stringify(hs));
    var hashMapNode = Java.use('java.util.Map$Node');
    var iterator = hs.entrySet().iterator();
    while(iterator.hasNext()){
        var entry = Java.cast(iterator.next(),hashMapNode);
        if(show) { (globalThis as any). console.log(entry.getKey(),'#', entry.getValue()) }
        m[entry.getKey()] =  entry.getValue().toString();
    }
    return m;

}

export const showAndroidToast = (t:string) =>{
    Java.scheduleOnMainThread(function() {
        const Toast = Java.use("android.widget.Toast");
        var currentApplication = Java.use('android.app.ActivityThread').currentApplication();
        var context = currentApplication.getApplicationContext();
        const s = Java.use("java.lang.String").$new(t)
        Toast.makeText(context,s, Toast.LENGTH_SHORT.value).show();
});
}

export const bypasSSLPinning = ()=>{
    Java.perform(function () {
        (globalThis as any). console.log('')
        (globalThis as any). console.log('===')
        (globalThis as any). console.log('* Injecting hooks into common certificate pinning methods *')
        (globalThis as any). console.log('===')
    
        var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
        var SSLContext = Java.use('javax.net.ssl.SSLContext');
    
        // build fake trust manager
        var TrustManager = Java.registerClass({
            name: 'com.sensepost.test.TrustManager',
            implements: [X509TrustManager],
            methods: {
                checkClientTrusted: function (chain, authType) {
                },
                checkServerTrusted: function (chain, authType) {
                },
                getAcceptedIssuers: function () {
                    return [];
                }
            }
        });
    
        // pass our own custom trust manager through when requested
        var TrustManagers = [TrustManager.$new()];
        var SSLContext_init = SSLContext.init.overload(
            '[Ljavax.net.ssl.KeyManager;', '[Ljavax.net.ssl.TrustManager;', 'java.security.SecureRandom'
        );
        SSLContext_init.implementation = function (keyManager:any, trustManager:any, secureRandom:any) {
            (globalThis as any). console.log('! Intercepted trustmanager request');
            SSLContext_init.call(this, keyManager, TrustManagers, secureRandom);
        };
    
        (globalThis as any). console.log('* Setup custom trust manager');
    
        // okhttp3
        try {
            var CertificatePinner = Java.use('okhttp3.CertificatePinner');
            CertificatePinner.check.overload('java.lang.String', 'java.util.List').implementation = function (str:any) {
                (globalThis as any). console.log('! Intercepted okhttp3: ' + str);
                return;
            };
    
            (globalThis as any). console.log('* Setup okhttp3 pinning')
        } catch(err) {
            (globalThis as any). console.log('* Unable to hook into okhttp3 pinner')
        }
    
        // trustkit
        try {
            var Activity = Java.use("com.datatheorem.android.trustkit.pinning.OkHostnameVerifier");
            Activity.verify.overload('java.lang.String', 'javax.net.ssl.SSLSession').implementation = function (str:any) {
                (globalThis as any). console.log('! Intercepted trustkit{1}: ' + str);
                return true;
            };
    
            Activity.verify.overload('java.lang.String', 'java.security.cert.X509Certificate').implementation = function (str:any) {
                (globalThis as any). console.log('! Intercepted trustkit{2}: ' + str);
                return true;
            };
    
            (globalThis as any). console.log('* Setup trustkit pinning')
        } catch(err) {
            (globalThis as any). console.log('* Unable to hook into trustkit pinner')
        }
    
        // TrustManagerImpl
        try {
            var TrustManagerImpl = Java.use('com.android.org.conscrypt.TrustManagerImpl');
            TrustManagerImpl.verifyChain.implementation = function (untrustedChain:any, trustAnchorChain:any, host:any, clientAuth:any, ocspData:any, tlsSctData:any) {
                (globalThis as any). console.log('! Intercepted TrustManagerImp: ' + host);
                return untrustedChain;
            };
    
            (globalThis as any). console.log('* Setup TrustManagerImpl pinning')
        } catch (err) {
            (globalThis as any). console.log('* Unable to hook into TrustManagerImpl')
        }
    
        // Appcelerator
        try {
            var PinningTrustManager = Java.use('appcelerator.https.PinningTrustManager');
            PinningTrustManager.checkServerTrusted.implementation = function () {
                (globalThis as any). console.log('! Intercepted Appcelerator');
            };
    
            (globalThis as any). console.log('* Setup Appcelerator pinning')
        } catch (err) {
            (globalThis as any). console.log('* Unable to hook into Appcelerator pinning')
        }
        
        // ByPass SSL pinning for Android 7+
        var array_list = Java.use("java.util.ArrayList");
        var ApiClient = Java.use('com.android.org.conscrypt.TrustManagerImpl');
        ApiClient.checkTrustedRecursive.implementation = function(a1:any,a2:any,a3:any,a4:any,a5:any,a6:any) {
            (globalThis as any). console.log('Bypassing SSL Pinning');
            var k = array_list.$new();
            return k;
        }
    
        // Force mode debug for all webview
        var WebView = Java.use('android.webkit.WebView');
        WebView.loadUrl.overload("java.lang.String").implementation = function (s:any) {
            (globalThis as any). console.log('Enable webview debug for URL: '+s.toString());
            this.setWebContentsDebuggingEnabled(true);
            this.loadUrl.overload("java.lang.String").call(this, s);
        };
    });
}


export const findJavaClasses = (clzname:string, show?:boolean):string[] =>{ 
    let clzs : string [] = []
    show = show??true;
    if(show) (globalThis as any). console.log('begin find class with ', clzname);                                                                                 
    Java.enumerateLoadedClasses({                                                                                                       
        onMatch(name, handle) {                                                                                                         
            if (name.includes(clzname)){                                                                                                
                if(show)  (globalThis as any). console.log(name, handle)                                                                                               
                clzs.push(name)
            }                                                                                                                           
        },                                                                                                                              
        onComplete() {                                                                                                                  
            if(show)(globalThis as any). console.log('find classes finished ')                                                                                       
        },                                                                                                                              
    });                                                                                                                                 
    return clzs;
}   


/* 
   Android SSL Re-pinning frida script v0.2 030417-pier 

   $ adb push burpca-cert-der.crt /data/local/tmp/cert-der.crt
   $ frida -U -f it.app.mobile -l frida-android-repinning.js --no-pause

   https://techblog.mediaservice.net/2017/07/universal-android-ssl-pinning-bypass-with-frida/
   
   UPDATE 20191605: Fixed undeclared var. Thanks to @oleavr and @ehsanpc9999 !
*/

export let bypasSSLPinningWithoutRegisterClasses = () => {
    	(globalThis as any). console.log("");
	    (globalThis as any). console.log("[.] Cert Pinning Bypass/Re-Pinning");

	    var CertificateFactory = Java.use("java.security.cert.CertificateFactory");
	    var FileInputStream = Java.use("java.io.FileInputStream");
	    var BufferedInputStream = Java.use("java.io.BufferedInputStream");
	    var X509Certificate = Java.use("java.security.cert.X509Certificate");
	    var KeyStore = Java.use("java.security.KeyStore");
	    var TrustManagerFactory = Java.use("javax.net.ssl.TrustManagerFactory");
	    var SSLContext = Java.use("javax.net.ssl.SSLContext");

	    // Load CAs from an InputStream
	    (globalThis as any). console.log("[+] Loading our CA...")
	    var cf = CertificateFactory.getInstance("X.509");
	    
	    try {
	    	var fileInputStream = FileInputStream.$new("/data/local/tmp/cert-der.crt");
	    }
	    catch(err) {
	    	(globalThis as any). console.log("[o] " + err);
	    }
	    
	    var bufferedInputStream = BufferedInputStream.$new(fileInputStream);
	  	var ca = cf.generateCertificate(bufferedInputStream);
	    bufferedInputStream.close();

		var certInfo = Java.cast(ca, X509Certificate);
	    (globalThis as any). console.log("[o] Our CA Info: " + certInfo.getSubjectDN());

	    // Create a KeyStore containing our trusted CAs
	    (globalThis as any). console.log("[+] Creating a KeyStore for our CA...");
	    var keyStoreType = KeyStore.getDefaultType();
	    var keyStore = KeyStore.getInstance(keyStoreType);
	    keyStore.load(null, null);
	    keyStore.setCertificateEntry("ca", ca);
	    
	    // Create a TrustManager that trusts the CAs in our KeyStore
	    (globalThis as any). console.log("[+] Creating a TrustManager that trusts the CA in our KeyStore...");
	    var tmfAlgorithm = TrustManagerFactory.getDefaultAlgorithm();
	    var tmf = TrustManagerFactory.getInstance(tmfAlgorithm);
	    tmf.init(keyStore);
	    (globalThis as any). console.log("[+] Our TrustManager is ready...");

	    (globalThis as any). console.log("[+] Hijacking SSLContext methods now...")
	    (globalThis as any). console.log("[-] Waiting for the app to invoke SSLContext.init()...")

	   	SSLContext.init.overload("[Ljavax.net.ssl.KeyManager;", "[Ljavax.net.ssl.TrustManager;", "java.security.SecureRandom").implementation = function(a:any,b:any,c:any) {
	   		(globalThis as any). console.log("[o] App invoked javax.net.ssl.SSLContext.init...");
	   		SSLContext.init.overload("[Ljavax.net.ssl.KeyManager;", "[Ljavax.net.ssl.TrustManager;", "java.security.SecureRandom").call(this, a, tmf.getTrustManagers(), c);
	   		(globalThis as any). console.log("[+] SSLContext initialized with our custom TrustManager!");
	   	}
    }

export const bodyToString = (body:any) => {
    let bodybuffer = Java.use('okio.Buffer').$new();
    //describeJavaClass(body)
    body.writeTo(bodybuffer);
    return bodybuffer.readUtf8();
}


type InfoType = {
    level:number,
}
const ginfo : InfoType= {
    level : 0,
};

const getLevelString = ()=>{
    return '  '.repeat(ginfo.level);
}

export type HookJavaEnterFunType=   (tstr:string, thiz:any, argsList:string[]|undefined, ...args:any)=>IArguments|void;
export type HookJavaLeaveFunType=   (tstr:string, thiz:any, argsList:string[]|undefined, ret:any,...args:any)=>any|void;

export type HookJavaFuncType = BaseHookJavaFuncType & {
    clzname:string,
};

export type HookJavaFuncOpts =  {
    
    enterFun    ?: HookJavaEnterFunType,
    leaveFun    ?: HookJavaLeaveFunType,
    hide        ?: boolean,
    dumpStack   ?: boolean,
    skip        ?: boolean | ((tstr:string, thiz:any, argsList:string[]|undefined, ...args:any)=>boolean),
    maxhit      ?: number,
};

export type BaseHookJavaFuncType = {
    methodName   : string,
    argsList    ?: string[],
    
} & HookJavaFuncOpts;

export const hookJavaFunction = (t:HookJavaFuncType) => {
    let method = t.argsList==undefined 
        ?  Java.use(t.clzname)[t.methodName]
        :  Java.use(t.clzname)[t.methodName].overload(...t.argsList)
    const hide      = t.hide?? false;
    const dumpStack = t.dumpStack?? false;
    const argsList  = t.argsList;
    const maxhit    = t.maxhit??-1;
    let hit = 0;
    method.implementation = function(){
        hit ++;
        let args = arguments; // can tramper arguments
        if(maxhit<0 || maxhit>=hit){
            if(!hide){ (globalThis as any). console.log(getLevelString(),'>',t.clzname, t.methodName, t.argsList, JSON.stringify(arguments)); }
            ginfo.level++;
            let tstr = getLevelString();
            if(t.enterFun!=undefined){ 
                let targs = t.enterFun(tstr,this, argsList, ...args);
                if(targs!=undefined){
                    args=targs;
                    if(!hide){ (globalThis as any). console.log(tstr, '>',t.clzname, t.methodName, t.argsList, JSON.stringify(args)); }
                }
            }
            if(dumpStack){ 
                (globalThis as any). console.log(tstr, 'Java call stack')
                getJavaCallStack().slice(3).forEach(t=>{
                    (globalThis as any). console.log(tstr, `  ${t.clzName}.${t.methodName}(${t.fileName}:${t.lineNumber})`);
                })
            }
        }
        let ret:any;
        let skip        = false;
        if(t.skip!=undefined){
            let tstr = getLevelString();
            if(typeof t.skip == 'boolean'){ skip = t.skip; }
            else{ skip = t.skip(tstr, this, argsList, ...args); }
        }
        if(!skip) ret = method.call(this, ...args);
        else ret=null;
        if(maxhit<0 || maxhit>=hit){
            let tstr = getLevelString();
            ginfo.level--;
            if(!hide){ (globalThis as any). console.log( '  '.repeat(ginfo.level), '<',t.clzname, t.methodName, ret); }
            if(t.leaveFun!=undefined){
                let tret = t.leaveFun(tstr, this, argsList, ret, ...args, argsList) 
                if(tret!=undefined){
                    { (globalThis as any). console.log(getLevelString(), 'mod return vaule =>',tret); }
                    return tret;
                } 
            }
        }
        return ret;
    }
}

function bytelist_java_to_js(bytelist:any){
    var rtn = new Array(bytelist.length)
    for(var i = 0; i < bytelist.length; ++i) {
        rtn[i] = bytelist[i]
    }
    return rtn;
}

export const byteArray2Python = (ba:any) => {
    var rtn = new Array(ba.length)
    for(var i = 0; i < ba.length; ++i) {
        rtn[i] = ((ba[i]+256)&0xff).toString()
    }
    const s = rtn.join(', ')
    return s;
}

export const sendCurrentActivityOrientationToLandscape = () =>{
    let activityClassName = getCurrentActivityClassName();
    (globalThis as any). console.log('activity class name', activityClassName);
    Java.choose(activityClassName,{
        onComplete() {
            (globalThis as any). console.log('ok')
        },
        onMatch(instance) {
            (globalThis as any). console.log('instance', instance)
            instance.setRequestedOrientation(Java.use('android.content.pm.ActivityInfo').SCREEN_ORIENTATION_LANDSCAPE.value);
        },
    })
}

export const executeCommandNative = (command:string) => {
    (globalThis as any). console.log('execuate command native ', command)
    const libc = Process.getModuleByName("libc.so");

    // Define the popen function signature
    const popenFunc = new NativeFunction(
        Module.getExportByName("libc.so", "popen"),
        "pointer",
        ["pointer", "pointer"]
    );

    // Define the pclose function signature
    const pcloseFunc = new NativeFunction(
        Module.getExportByName("libc.so", "pclose"),
        "int",
        ["pointer"]
    );

    const fgetsFunc = new NativeFunction(
        Module.getExportByName('libc.so', 'fgets'),
        'pointer',
        ['pointer', 'int', 'pointer']
    );
    // Find the address of the `read()` function in libc
    // Execute the command using popen
    const commandOutputPtr = popenFunc(Memory.allocUtf8String(command), Memory.allocUtf8String("r"));

    const lineBufferSize = Process.pageSize;
    const line = Memory.alloc(lineBufferSize)
    for (let t = 0; t < 100; t++) {
        let read = fgetsFunc(line, lineBufferSize - 1, commandOutputPtr);
        if (read.isNull()) break;
        (globalThis as any). console.log(line.readUtf8String());
    }

    // Close the command pipe
    pcloseFunc(commandOutputPtr);

}

export const executeShellCommand = (cmd:string) => {
    (globalThis as any). console.log(`execute  ${cmd}`)
    var result = "";
    var BufferedReader = Java.use("java.io.BufferedReader");
    var InputStreamReader = Java.use("java.io.InputStreamReader");
    var Runtime = Java.use("java.lang.Runtime");

    try {
        var p = Runtime.getRuntime().exec(cmd);
        var inputStreamReader = InputStreamReader.$new(p.getInputStream());
        var bufferedReader = BufferedReader.$new(inputStreamReader);
        var line = null;
        while ((line = bufferedReader.readLine()) !== null) {
            result += line + "\n";
        }
        bufferedReader.close();
    } catch (e) {
        (globalThis as any). console.log(e);
    }

    return result;
}

export const getApplicationContext = () => {
    const activityThread = Java.use('android.app.ActivityThread');
    const app = activityThread.currentApplication();
    const context = app.getApplicationContext();
    return context;
}

export const getTopActivity = () => {
    let context = getApplicationContext()
    context = JavaCast(context, 'android.content.Context');
    let activityManager = context.getSystemService("activity");
    activityManager = JavaCast(activityManager,  'android.app.ActivityManager');
    const taskList = activityManager.getRunningTasks(1000);
    const activities: string[] = [];
    let task = taskList.get(0);
    task = JavaCast(task,'android.app.ActivityManager$RunningTaskInfo');
    const info = task.topActivity.value;
    return info
}

export const findActivityByClassName = (className: string): any => {
  // Get a reference to the ActivityThread class
  const activityThread = Java.use("android.app.ActivityThread");

  // Get the current activity thread instance
  const currentActivityThread = activityThread.currentActivityThread();

  // Get the mActivities field from the current activity thread instance
  const activitiesField = currentActivityThread.getClass().getDeclaredField("mActivities");

  // Set the mActivities field as accessible
  activitiesField.setAccessible(true);

  // Get the list of activities as an ArrayMap object and cast it to the correct type
  const activitiesMap = Java.cast(activitiesField.get(currentActivityThread), Java.use('android.util.ArrayMap'));

  let activity: Java.Wrapper | null = null;
  // Iterate through the list of activities
  for (let i = 0; i < activitiesMap.size(); i++) {
    // Get the activity record from the ArrayMap
    const activityRecord = Java.cast(activitiesMap.valueAt(i), Java.use('android.app.ActivityThread$ActivityClientRecord'));

    // If there's no activity record, continue to the next iteration
    if (!activityRecord) continue;

    // Get the activity instance from the activity record and cast it to the correct type
    activity = Java.cast(activityRecord.activity.value, Java.use('android.app.Activity'));

    // If the activity's class name matches the given class name, return it
    if (activity && activity.getClass().getName() === className) {
      return activity;
    }
  }
  // If no activity was found, return null
  return null;
}

export const getCurrentActivity = (): any => {
    let activityClassName = getCurrentActivityClassName();
    let activtity = findActivityByClassName(activityClassName);
    return activtity;
}

export interface Overload {
    argTypes : string[];
    modifiers?: any;
    retType  : string;
  }
  
export const listMethodOverloads = (className: string, methodName: string): Overload[] => {
    const clazz = Java.use(className);
    const method = clazz[methodName].overloads;
  
    const overloads: Overload[] = [];
    for (let i = 0; i < method.length; i++) {
      const overload = method[i];
      let argumentTypes:{className:string}[] = overload.argumentTypes;
      const argTypes = argumentTypes.map(argType => argType.className);
      const retType = overload.returnType.className;
      overloads.push({ argTypes, retType });
    }
  
    return overloads;
}
 

export const drawLine = (startX: number, startY: number, endX: number, endY: number, color: number, thickness: number, sizeX:number, sizeY:number, backgroundColor: number): void => {
    let activity = getCurrentActivity();
    activity = JavaCast(activity, activity.getClass().getName())
    let Runnable = Java.use("java.lang.Runnable");
    let MyRunnable = Java.registerClass({
      name: "com.frida.MyRunnable",
      implements: [Runnable],
      fields: {
      },
      methods: {
          run: function() {
            let surfaceViewClass = Java.use('android.view.SurfaceView');
            let Callback = Java.use('android.view.SurfaceHolder$Callback')
            let surfaceHolderCallback = Java.registerClass({
                name: 'com.frida.SurfaceHolderCallback',
                implements: [Callback],
                methods: {
                    surfaceChanged: function(holder, format, width, height) {
                        (globalThis as any). console.log('Surface changed');
                    },
                    surfaceCreated: function(holder) {
                        (globalThis as any). console.log('Surface created');
                        let canvas = holder.lockCanvas();
                        let paintClass = Java.use('android.graphics.Paint');
                        let paint = paintClass.$new();
                        let paintStyleClass = Java.use('android.graphics.Paint$Style')
                        let paintStyle = paintStyleClass.STROKE.value;
                        paint.setStyle(paintStyle);
                        paint.setARGB(255, (color >> 16) & 0xFF, (color >> 8) & 0xFF, color & 0xFF);
                        paint.setStrokeWidth(thickness);
                        canvas.drawColor(backgroundColor);
                        canvas.drawLine(startX, startY, endX, endY, paint);
                        holder.unlockCanvasAndPost(canvas);
                    },
                    surfaceDestroyed: function(holder) {
                        (globalThis as any). console.log('Surface destroyed');
                    }
                }
            });


            let surfaceView = surfaceViewClass.$new(activity);
            let surfaceHolder = surfaceView.getHolder();
            surfaceHolder.addCallback(surfaceHolderCallback.$new());

            let layoutParamsClass = Java.use('android.view.ViewGroup$LayoutParams');
            let layoutParams = layoutParamsClass.$new(sizeX, sizeY);
            activity.getWindow().addContentView(surfaceView, layoutParams);
          }
       }
    });
    let runnable = MyRunnable.$new();
    activity.runOnUiThread( runnable);
}

export const getScreenPosition = (widget: any) => {
    let location = Java.use('android.graphics.Rect').$new();
    widget.getWindowVisibleDisplayFrame(location);
    (globalThis as any). console.log('location', location, JSON.stringify(location));
    let X = widget.getX();
    let Y = widget.getY();
    (globalThis as any). console.log('X', X, JSON.stringify(X));
    (globalThis as any). console.log('Y', Y, JSON.stringify(Y));
    let x = location.left.value + widget.getX();
    let y = location.top.value + widget.getY();
    return { x: x, y: y };
}

export const tapAt = (x:number, y:number) => {
    executeShellCommand(`input touchscreen motionevent DOWN ${x} ${y}`);
    //executeShellCommand(`input touchscreen motionevent UP   ${x} ${y}`);
    // executeShellCommand(`input touchscreen swipe   ${x} ${y}  ${x} ${y} 0`);
}

export const tapView = (view:any) => {
    let pos = getViewScreenPosition(view);
    let sz = getViewSize(view)
    let x = pos.x + Math.floor(sz.width / 2);
    let y = pos.y + Math.floor(sz.height / 2);
    tapAt(x, y);
}

/**
 * Enumerates all views in the current activity, including popup dialogs,
 * and calls the provided callback function with each view and its depth.
 * 
 * @param cb A callback function that will be called with each view and its depth.
 * The function should take two parameters: the view object and its depth in the view hierarchy.
 */
export const enumearteAllViews = (cb: (view: any, depth: number) => void): void => {
    let globalWindowManagerClass = Java.use("android.view.WindowManagerGlobal");
    let globalWindowManager = globalWindowManagerClass.getInstance();
    globalWindowManager = Java.cast(globalWindowManager, Java.use(globalWindowManager.getClass().getName()));
    let rootViews = globalWindowManager['mRoots'].value;
    for (let i = 0; i < rootViews.size(); i++) {
        let viewRootImpl = JavaCast(rootViews.get(i), 'android.view.ViewRootImpl');
        if (viewRootImpl == null) continue;
        let rootView = viewRootImpl.getView();
        if (rootView == null) continue;
        rootView = rootView.getRootView();
        enumerateSubviews(rootView, 0, cb);
    }
}

export interface Method {
    name: string;
    returnType: string;
    argTypes: string[];
    modifiers: string[];
}


export interface JavaCallStackFrame {
    clzName?: string,
    methodName?: string,
    fileName?: string,
    lineNumber?: string,
};

export const getJavaCallStack = (): JavaCallStackFrame[] => {
    const Thread = Java.use('java.lang.Thread');
    const Thread_currentThread = Thread.currentThread;
    const stackTrace = Thread.currentThread().getStackTrace();

    const infos :JavaCallStackFrame[] = [];

    stackTrace.forEach((stackElement: any) => {
        infos.push({
            clzName     : stackElement.getClassName(),
            methodName  : stackElement.getMethodName(),
            fileName    : stackElement.getFileName(), 
            lineNumber  : stackElement.getLineNumber(),
        })
    });
    return infos;
}

export const getClassName = (obj: any): string => {
    return Java.use("java.lang.Object").getClass.call(obj).getName();
}

const MOD_PUBLIC = 0x0001;
const MOD_PRIVATE = 0x0002;
const MOD_PROTECTED = 0x0004;
const MOD_STATIC = 0x0008;
const MOD_FINAL = 0x0010;
const MOD_SYNCHRONIZED = 0x0020;
const MOD_BRIDGE = 0x0040;
const MOD_VARARGS = 0x0080;
const MOD_NATIVE = 0x0100;
const MOD_ABSTRACT = 0x0400;
const MOD_STRICT = 0x0800;
const MOD_SYNTHETIC = 0x1000;

const getMethodModifiers = (modifiersInt: number): string[] => {
    const modifiers: string[] = [];

    if (modifiersInt & MOD_PUBLIC) {
        modifiers.push('public');
    }
    if (modifiersInt & MOD_PRIVATE) {
        modifiers.push('private');
    }
    if (modifiersInt & MOD_PROTECTED) {
        modifiers.push('protected');
    }
    if (modifiersInt & MOD_STATIC) {
        modifiers.push('static');
    }
    if (modifiersInt & MOD_FINAL) {
        modifiers.push('final');
    }
    if (modifiersInt & MOD_SYNCHRONIZED) {
        modifiers.push('synchronized');
    }
    if (modifiersInt & MOD_BRIDGE) {
        modifiers.push('bridge');
    }
    if (modifiersInt & MOD_VARARGS) {
        modifiers.push('varargs');
    }
    if (modifiersInt & MOD_NATIVE) {
        modifiers.push('native');
    }
    if (modifiersInt & MOD_ABSTRACT) {
        modifiers.push('abstract');
    }
    if (modifiersInt & MOD_STRICT) {
        modifiers.push('strict');
    }
    if (modifiersInt & MOD_SYNTHETIC) {
        modifiers.push('synthetic');
    }

    return modifiers;
}

export const listJavaClassMethods = (className: string, show?:boolean): Method[] => {
    show = show?? true;
    const clazz = Java.use(className);
    const methods:any[] = clazz.class.getDeclaredMethods();

    const classMethods: Method[] = [];
    methods.forEach(method => {
        const modifiers = getMethodModifiers(method.getModifiers());
        const name = method.getName();
        const returnType = method.getReturnType().getName();
        const argTypes:any = [];
        const params = method.getParameterTypes();
        for (let i = 0; i < params.length; i++) {
            argTypes.push(params[i].getName());
        }
        const info = { name, returnType, argTypes, modifiers };
        if(show) (globalThis as any). console.log(className, 'method', JSON.stringify(info))
        classMethods.push(info);
    });

    return classMethods;
}


export const listPermissions = () => {
    const ActivityThread = Java.use('android.app.ActivityThread');
    const PackageManager = Java.use('android.content.pm.PackageManager');
    const context = ActivityThread.currentApplication().getApplicationContext();
    const packageManager = context.getPackageManager();
    const packageName = context.getPackageName();
    const value = PackageManager.GET_PERMISSIONS.value;
    const packageInfo = packageManager.getPackageInfo(packageName, value);
  
    const permissions = packageInfo.requestedPermissions.value;
    (globalThis as any). console.log('Permissions:', permissions, JSON.stringify(permissions));
}

export interface Field {
    name: string;
    type: string;
    modifiers: string[];
}

export const listJavaClassFields = (clazzName: string, show?:boolean) : Field[] => {
    show = show ?? true;
    let rets : Field[] = [];
    const clazz = Java.use(clazzName);
    const fields = clazz.class.getDeclaredFields();
    for (const field of fields) {
        const modifiersInt = field.getModifiers();
        const modifiers: string[] = getMethodModifiers(modifiersInt);
        const name: string = field.getName();
        const type: string = field.getType().getName();
        const info =  {name,type, modifiers};
        if(show) {(globalThis as any). console.log(JSON.stringify(info))}
        rets.push(info);
    }
    return rets;
}

export const convertHashsetToArray = (set:any): any[] =>{
    let a:any[] = [];
    // Get an iterator for the set
    const iterator = set.iterator();
    // Loop through the items in the set
    while (iterator.hasNext()) {
        const item = iterator.next();
        a.push(item);
    }
    return a;
}

export const listHashMap = (hs:any, show?:boolean): {[key:string]:string} => {

    show = show??true;
    let m :{[key:string]:string}  =  {}
    if(hs==null) return m;

    hs = JavaCast(hs, getClassName(hs))
    var iterator = hs.entrySet().iterator();
    while(iterator.hasNext()){
        var entry =  iterator.next();
        entry = JavaCast(entry, getClassName(entry))
        if(show) { (globalThis as any). console.log(entry.getKey(),'#', entry.getValue()) }
        m[entry.getKey()] =  entry.getValue().toString();
    }
    return m;

}

export const convertArgArray2String = (a:any[]):string =>{
    const aa:string [] = []; for(let t = 0; t<a.length;t++){ aa.push(a[t]); } 
    return aa.join(' ');
}

export const hookMethodsInClass = (clzname:string, opts?:any)=>{
    listJavaClassMethods(clzname)
        .forEach(m=>{
            let info : HookJavaFuncType  = {
                clzname, methodName:m.name, argsList:m.argTypes,
            };

            if(opts) { info = {... info, ... opts}; }

            (globalThis as any). console.log('hooking', clzname, 'method', m, JSON.stringify(m), JSON.stringify(info))
            hookJavaFunction(info)
        })
}

export const exitAndroidApp = ()=>{
     // Get the current activity's instance
     var currentActivity = getCurrentActivity();
 
     // Print the result to the (globalThis as any). console
     (globalThis as any). console.log('current activity', currentActivity);
     if(currentActivity!=null) currentActivity.finish();

     Java.use('java.lang.System').exit(0);
}

export const getIterateArray = (list:any, show?:boolean):string[] => {
    show = show ?? false;
    const it = list.iterator();
    let ret:string[] = []
    while (it.hasNext()) {
        let  item = it.next();
        let s = item.toString();
        if(show) (globalThis as any). console.log(s)
        ret.push(s)
        //let obj = JavaCast(item, 'com.miui.analytics.a.a.a')
        //(globalThis as any). console.log(obj);
    }
    return ret;
}

export const convertJavaByteArrayToString = (byteArray: any) => {
    const str = Memory.alloc(byteArray.length + 1);
    for (let i = 0; i < byteArray.length; i++) {
        str.add(i).writeU8(byteArray[i]);
    }
    str.add(byteArray.length).writeU8(0); // null-terminate the string
    return str.readUtf8String();
}

export const dumpByteArray = (byteArray: any) => {
    const byteArrayLength = byteArray.length;
    const memory = Memory.alloc(byteArrayLength);
    const uint8Array = new Uint8Array(byteArray);
    uint8Array.forEach((byte, index) => {
        memory.add(index).writeU8(byte);
    });
    dumpMemory(memory, byteArrayLength);
}


class AndroidInstance {
    instance:any;

    constructor(instance:any) {
        this.instance = instance;
    }
};


export class AndroidView extends AndroidInstance {

    static readonly CLZ_NAME: string = 'android.view.View';

    constructor(instance:any){
        super(JavaCast(instance, AndroidView.CLZ_NAME));
    }

    public getText():string|null {
        const textView = JavaCast(this.instance,'android.widget.TextView')
        if(textView!=null) {
            const text = textView.getText();
            return text.toString();
        }
        return null;
    }

    public toString(): string {
        const {left, top, right, bottom} = this.getRect()
        const visibility = this.getVisibility();
        return  `${left},${top}-${right},${bottom} ${getClassName(this.instance)}`;
    }

    public isVisiable () : boolean {
        const clz = Java.use(AndroidView.CLZ_NAME);
        return this.instance.getVisibility() == Java.use(AndroidView.CLZ_NAME).VISIBLE.value;
    }

    public getVisibility():number{
        return this.instance.getVisibility();
    }

    public getRect() : {left:number, top:number, right:number, bottom:number} {
        const myViewRect = Java.use('android.graphics.Rect').$new();
        this.instance.getGlobalVisibleRect(myViewRect);
        const left  = myViewRect.left.value ;
        const top   = myViewRect.top.value ;
        const right = myViewRect.right.value ;
        const bottom= myViewRect.bottom.value;
        return  {
            left,
            top,
            right ,
            bottom,
        }
    }
    
    public enumerateChildren(
        cb: (view: AndroidView, index: number)=>void,
    ) : void {

        let viewGroup = JavaCast(this.instance, 'android.view.ViewGroup');
        if(viewGroup!=null){
            for (let i = 0; i < viewGroup.getChildCount(); i++) {
                const childView = new AndroidView(viewGroup.getChildAt(i));
                cb(childView, i);
            }
        }
    }

    static enumerateAllViews(
        cb: (view: AndroidView, depth: number)=>void,
    ) : void {
        let globalWindowManagerClass = Java.use("android.view.WindowManagerGlobal");
        let globalWindowManager = globalWindowManagerClass.getInstance();
        globalWindowManager = Java.cast(globalWindowManager, Java.use(globalWindowManager.getClass().getName()));
        let rootViews = globalWindowManager['mRoots'].value;
        for (let i = 0; i < rootViews.size(); i++) {
            let viewRootImpl = JavaCast(rootViews.get(i), 'android.view.ViewRootImpl');
            if (viewRootImpl == null) continue;
            let rootView = viewRootImpl.getView();
            if (rootView == null) continue;
            rootView = rootView.getRootView();
            new AndroidView(rootView).enumerateViewsRecursive(cb,)
        }
    }

    // Recursive method to iterate over all views and subviews
    public enumerateViewsRecursive(
        cb: (view: AndroidView, depth: number)=>void,
        depth?:number
    ):void {

        depth = depth ?? 0;

        cb(this, depth);

        let viewGroup = JavaCast(this.instance, 'android.view.ViewGroup');
        if(viewGroup!=null){
            for (let i = 0; i < viewGroup.getChildCount(); i++) {
                const childView = new AndroidView(viewGroup.getChildAt(i));
                childView.enumerateViewsRecursive(cb, depth+1);
            }
        }
    }

    public tap() : void {
        const {left, top, right, bottom} = this.getRect()
        const x = Math.round((left+right)/2);
        const y = Math.round((top+bottom)/2);
        executeShellCommand(`input touchscreen motionevent down ${x} ${y}`);
        Thread.sleep(.1)
        executeShellCommand(`input touchscreen motionevent up ${x} ${y}`);
        Thread.sleep(.1)
        executeShellCommand(`input touchscreen swipe   ${x} ${y}  ${x} ${y} 0`);
    }

};

export class AndroidActivity extends AndroidInstance {

    static readonly CLZ_NAME: string = 'android.app.Activity';

    public constructor(instance:any){
        super(JavaCast(instance, AndroidActivity.CLZ_NAME))
    }

    public getContentView():AndroidView {
        return new AndroidView(this.instance.findViewById(16908290)); // The ID for android.R.id.content is usually 0x0102002c (16908290 in decimal)
    }

    public enumerateViews( cb: (view:AndroidView, depth: number)=>void,):void {
        const rootView = this.instance.getWindow().getDecorView().getRootView();
        new AndroidView(rootView).enumerateViewsRecursive(cb);
        //this.getContentView().enumerateViewsRecursive(cb,)
    }
};

export const iterateSet = (set: any, cb?:(e:any)=>boolean)=>{
    const JavaSet =Java.use('java.util.Set')
    set = set as typeof JavaSet;
    cb = cb ?? function(e:any){
        (globalThis as any). console.log('element', e);
        return true;
    }
    const size = set.size();
    let iterator = set.iterator()
    while(iterator.hasNext()){
        const element = iterator.next();
        if(!cb(element))break;
    }
}

const JavaList =Java.use('java.util.List')
export const iterateList = (list: typeof JavaList, cb?:(e:any, idx:number)=>boolean)=>{
    cb = cb ?? function(e:any, idx:number){
        (globalThis as any). console.log(idx, 'element', e);
        return true;
    }
    const size = list.size();
    for(let t = 0;t<size; t++){
        const element = list.get(t);
        if(!cb(element, t))break;
    }
}

export const getAndroidVersioninfo = ()=>{

    return {
        apiVersion: Java.use('android.os.Build$VERSION').SDK_INT.value,
        androidVersion: Java.use('android.os.Build$VERSION').RELEASE.value,
    }
}

}
