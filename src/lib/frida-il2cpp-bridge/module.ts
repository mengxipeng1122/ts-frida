namespace Il2Cpp {
    /**
     * Gets the IL2CPP module (a *native library*), that is where the IL2CPP
     * exports will be searched for (see {@link Il2Cpp.api}).
     *
     * The module is located by its name:
     * - Android: `libil2cpp.so`
     * - Linux: `GameAssembly.so`
     * - Windows: `GameAssembly.dll`
     * - iOS: `UnityFramework`
     * - macOS: `GameAssembly.dylib`
     *
     * On iOS and macOS, IL2CPP exports may be located within a module having
     * a different name.
     *
     * In any case, it is possible to override or set the IL2CPP module name
     * using a global variable:
     * ```ts
     * (globalThis as any).IL2CPP_MODULE_NAME = "CustomName.dylib";
     *
     * Il2Cpp.perform(() => {
     *     // ...
     * });
     * ```
     */
    export declare const module: Module;
    getter(Il2Cpp, "module", () => {
        const [moduleName, fallback] = getExpectedModuleNames();
        return Process.findModuleByName(moduleName) ?? Process.getModuleByName(fallback);
    });

    /**
     * @internal
     * Waits for the IL2CPP native library to be loaded and initialized.
     */
    export async function initialize(blocking = false): Promise<boolean> {
        Reflect.defineProperty(Il2Cpp, "module", {
            // prettier-ignore
            value: Process.platform == "darwin"
                ? Process.findModuleByAddress(DebugSymbol.fromName("il2cpp_init").address) 
                    ?? await forModule(...getExpectedModuleNames())
                : await forModule(...getExpectedModuleNames())
        });

        // At this point, the IL2CPP native library has been loaded, but we
        // cannot interact with IL2CPP until `il2cpp_init` is done.
        // It looks like `il2cpp_get_corlib` returns NULL only when the
        // initialization is not completed yet.
        if (Il2Cpp.api.getCorlib().isNull()) {
            return await new Promise<boolean>(resolve => {
                const interceptor = Interceptor.attach(Il2Cpp.api.initialize, {
                    onLeave() {
                        interceptor.detach();
                        blocking ? resolve(true) : setImmediate(() => resolve(false));
                    }
                });
            });
        }

        return false;
    }

    function getExpectedModuleNames(): string[] {
        if ((globalThis as any).IL2CPP_MODULE_NAME) {
            return [(globalThis as any).IL2CPP_MODULE_NAME];
        }

        switch (Process.platform) {
            case "linux":
                return [Android.apiLevel ? "libil2cpp.so" : "GameAssembly.so"];
            case "windows":
                return ["GameAssembly.dll"];
            case "darwin":
                return ["UnityFramework", "GameAssembly.dylib"];
        }

        raise(`${Process.platform} is not supported yet`);
    }
}
