
# This is device_arch.mk

# Check the adb command and store the device architecture in a variable if successful
define get_device_arch
$(shell adb shell getprop ro.product.cpu.abi 2>/dev/null | tr -d '\r' || { echo >&2 "Error: adb command failed."; exit 1; })
endef

DEVICE_ARCH := $(call get_device_arch)

.PHONY: check_arch


# Target that checks the device architecture coming from the included device_arch.mk
check_arch:
	@if [ -z "$(DEVICE_ARCH)" ]; then                             \
  echo "Error: DEVICE_ARCH is empty, something went wrong.";      \
  exit 1;                                                         \
 elif [ "$(DEVICE_ARCH)" = "armeabi-v7a" ]; then                  \
  echo "The device architecture is ARM.";                         \
 elif [ "$(DEVICE_ARCH)" = "arm64-v8a" ]; then                    \
  echo "The device architecture is ARM64.";                       \
 else                                                             \
  echo "The device architecture is not ARM or ARM64. Actual architecture: $(DEVICE_ARCH)"; \
 fi


