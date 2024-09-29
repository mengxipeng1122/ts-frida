LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)
LOCAL_MODULE:= patchgame
LOCAL_SRC_FILES := 
LOCAL_C_INCLUDES := 
LOCAL_LDLIBS := 
LOCAL_ARM_MODE := 
LOCAL_ALLOW_UNDEFINED_SYMBOLS := true
LOCAL_CFLAGS= -fno-exceptions -fno-stack-protector -z execstack
LOCAL_CPPFLAGS += -fvisibility=hidden 
include $(BUILD_SHARED_LIBRARY)


