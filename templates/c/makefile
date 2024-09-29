
ifndef NDKPATH
    $(error NDKPATH not set)
endif

.PHONY: all
.DEFAULT_GOAL := all

include ../device_arch.mk

all: build_android push_device

build_android:
	(cd  jni; ${NDKPATH}/ndk-build V=1)

clean:
	(cd  jni; ${NDKPATH}/ndk-build clean)

.PHONY: push_device

SO_NAME:=libpatchgame.so

push_device:
	@if [ -e  ./libs/$(DEVICE_ARCH)/${SO_NAME} ]; then   \
	    echo pushing ./libs/$(DEVICE_ARCH)/${SO_NAME} ;   \
	    adb push ./libs/$(DEVICE_ARCH)/${SO_NAME} /data/local/tmp/;   \
    else  \
	    echo 'can not push ${SO_NAME} with $(DEVICE_ARCH)';  \
	    exit  -2 ;  \
    fi 

