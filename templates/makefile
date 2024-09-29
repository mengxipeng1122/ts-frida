
# Check the adb command and store the device architecture in a variable if successful

.PHONY: all
.DEFAULT_GOAL := all

include device_arch.mk

all: check_arch build_c convert_so 
	./node_modules/.bin/frida-compile index.ts -o _agent.js -c

convert_so:
	./node_modules/ts-frida/dist/bin/so2ts.py --no-content -b c/libs/$(DEVICE_ARCH)/libpatchgame.so -o modinfos/libmodpatchgame.ts

build_c:
	make -C c



