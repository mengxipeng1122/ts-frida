
#pragma once

#include <stdio.h>
#include <string>

extern "C" void _frida_log(const char* message);
extern "C" void _frida_err(const char* message, bool exit=false);
extern "C" void _frida_hexdump(void* ptr, int len=0x20);

#define LOG_INFOS_WITH_N(N, fmt, args...)                         \
do{                                                               \
    char buff[N];                                                 \
    snprintf(buff, N,  fmt , ##args);                             \
    _frida_log(buff);                                    \
}while(0)

#define LOG_INFOS_WITH_N_FILE_LINE(N, fmt, args...)               \
LOG_INFOS_WITH_N(N, "[%s:%d] " fmt , __FILE__, __LINE__,  ##args);

#define LOG_INFOS(fmt, args...)  LOG_INFOS_WITH_N_FILE_LINE(0x800, fmt, ##args)


int check_folder_exist(const char *folder_path) ;
int make_folder(const char *folder_path) ;
int delete_and_remake_folder(const char *folder_path) ;
int create_dir_recursively(const char *dir) ;
int write_bytes_to_file(const char *file_path, const unsigned char *data, size_t data_size) ;
int write_text_file (const char* filename, char* context) ;
int base64_encode(const unsigned char *in, int in_len, char *out, int out_len) ;

#if defined(__NDK_MAJOR__) && defined(__NDK_MINOR__)
    #if __NDK_MAJOR__ >= 19
    #endif
#endif

std::string get_module_name_and_offset(void* ptr) ;
std::string utf16_to_utf8(const std::u16string& utf16_str) ;
std::string utf16_to_utf8(const char16_t* utf16_str, int length) ;

