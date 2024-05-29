
# usage example

```c++
extern "C" __attribute__((visibility("default"))) int init (unsigned char* base, const char* outputDir) {

    imguiInit(750,1334);

    return 0;
}

extern "C" __attribute__((visibility("default"))) int hookGL () {
    imguiDraw();
    return 0;
}
```