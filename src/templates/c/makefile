
ifndef NDKPATH
    $(error NDKPATH not set)
endif

all: build_android push_device

build_android:
	(cd  jni; ${NDKPATH}/ndk-build V=1)
	@if [ -e  ./libs/`adb shell getprop ro.product.cpu.abi`/${SO_NAME} ]; then   \
	     cp   ./libs/`adb shell getprop ro.product.cpu.abi`/${SO_NAME} /tmp/;   \
	fi


clean:
	(cd  jni; ${NDKPATH}/ndk-build clean)

.PHONY: push_device

SO_NAME:=libpatchgame.so

push_device:
	@if [ -e  ./libs/`adb shell getprop ro.product.cpu.abi`/${SO_NAME} ]; then   \
	    echo pushing ./libs/`adb shell getprop ro.product.cpu.abi`/${SO_NAME} ;   \
	    adb push ./libs/`adb shell getprop ro.product.cpu.abi`/${SO_NAME} /data/local/tmp/;   \
	elif [ -e  ./libs/armeabi-v7a/${SO_NAME} ]; then  \
	    echo pushing ./libs/armeabi-v7a/${SO_NAME} ;   \
	    adb push ./libs/armeabi-v7a/${SO_NAME} /data/local/tmp/ ;  \
    else  \
	    echo 'can not push ${SO_NAME} ';  \
	    exit  -2 ;  \
    fi 

