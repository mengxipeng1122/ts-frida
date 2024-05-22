
all: convert_so
	./node_modules/.bin/frida-compile index.ts -o _agent.js -c

convert_so:
	./node_modules/ts-frida/dist/bin/so2ts.py -b c/libs/arm64-v8a/libpatchgame.so -o modinfos/libmodpatchgame.ts --no-content


