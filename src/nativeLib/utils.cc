
#include <errno.h>
#include <string>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ftw.h>
#include <dlfcn.h>

#include "utils.h"

int delete_file(const char *path, const struct stat *s, int type, struct FTW *ftwb) {
    if(remove(path) < 0) {
        LOG_INFOS("remove");
        return -1;
    }
    return 0;
}

int check_folder_exist(const char *folder_path) {
    struct stat st;
    if (stat(folder_path, &st) < 0) {
        LOG_INFOS("stat");
        return -1;
    }
    if (!S_ISDIR(st.st_mode)) {
        LOG_INFOS("S_ISDIR");
        return -1;
    }
    return 0;
}

int make_folder(const char *folder_path) {
    if (mkdir(folder_path, S_IRWXU | S_IRWXG | S_IROTH | S_IXOTH) < 0) {
        LOG_INFOS("mkdir");
        return -1;
    }
    return 0;
}

int delete_and_remake_folder(const char *folder_path) {
    if (nftw(folder_path, delete_file, 64, FTW_DEPTH | FTW_PHYS) < 0) {
        LOG_INFOS("nftw");
        return -1;
    }

    return make_folder(folder_path);

}

// Function to create a directory recursively
int create_dir_recursively(const char *dir) {
    char tmp[256];
    char *p = NULL;
    size_t len;

    snprintf(tmp, sizeof(tmp), "%s", dir);
    len = strlen(tmp);
    if (tmp[len - 1] == '/') {
        tmp[len - 1] = 0;
    }

    // Loop over each directory level and create if necessary
    for (p = tmp + 1; *p; p++) {
        if (*p == '/') {
            *p = 0;
            mkdir(tmp, S_IRWXU | S_IRWXG | S_IRWXO);
            *p = '/';
        }
    }

    // The final directory is created here
    if (mkdir(tmp, S_IRWXU | S_IRWXG | S_IRWXO) != 0 && errno != EEXIST) {
        return -1; // Return -1 if an error occurred
    }

    return 0;
}

// Function to write bytes to a file and create its directory if it doesn't exist
int write_bytes_to_file(const char *file_path, const unsigned char *data, size_t data_size) {
    char dir_path[256];
    strcpy(dir_path, file_path);

    // Extract directory path from the file path
    char *last_slash = strrchr(dir_path, '/');
    if (last_slash != NULL) {
        *last_slash = 0; // End the directory path string here

        // Create directory if it does not exist
        if (create_dir_recursively(dir_path) != 0) {
            fprintf(stderr, "Error: Unable to create directory %sn", dir_path);
            return -1;
        }
    } else {
        // No directory in file path
        fprintf(stderr, "Error: The provided file path does not contain a directory.n");
        return -1;
    }

    // Write data to file
    FILE *file = fopen(file_path, "wb");
    if (!file) {
        perror("Error opening file for writing");
        return -1;
    }

    if (fwrite(data, sizeof(unsigned char), data_size, file) != data_size) {
        fprintf(stderr, "Error writing to file %sn", file_path);
        fclose(file);
        return -1;
    }

    fclose(file);
    return 0; // Success
}

int write_text_file (const char* filename, char* context) {
    FILE* fp = fopen(filename, "w");
    if (fp == (void*)0) {
        return -1;
    }
    int ret = fprintf(fp, "%s", context);
    fclose(fp);
    return ret;
}


static const char base64_chars[] =
             "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
             "abcdefghijklmnopqrstuvwxyz"
             "0123456789+/";

int base64_encode(const unsigned char *in, int in_len, char *out, int out_len) {
    int i, j;
    int output_len = 4 * ((in_len + 2) / 3);

    if (out != NULL) {
        for (i = 0, j = 0; i < in_len; i += 3, j += 4) {
            int a = in[i];
            int b = (i + 1 < in_len) ? in[i + 1] : 0;
            int c = (i + 2 < in_len) ? in[i + 2] : 0;

            out[j] = base64_chars[a >> 2];
            out[j + 1] = base64_chars[((a & 0x03) << 4) | (b >> 4)];
            out[j + 2] = (i + 1 < in_len) ? base64_chars[((b & 0x0F) << 2) | (c >> 6)] : '=';
            out[j + 3] = (i + 2 < in_len) ? base64_chars[c & 0x3F] : '=';
        }

        if (j < out_len) {
            out[j] = '0';
        }
    }

    return output_len;
}

static std::string get_base_name(const std::string& pathname) {
    // Find the last position of the path separator
    size_t pos = pathname.find_last_of("/\\");
    if (pos != std::string::npos) {
        // Return the substring after the last path separator
        return pathname.substr(pos + 1);
    }
    return pathname; // If no separator was found, return the whole string
}

std::string get_module_name_and_offset(void* ptr) {
    Dl_info dl_info;
    if (dladdr(ptr, &dl_info) == 0) {
        return "Error: Could not find module for the given pointer.";
    }

    // dl_info.dli_fbase gives the base address where the shared object is loaded.
    uintptr_t base_address = reinterpret_cast<uintptr_t>(dl_info.dli_fbase);
    // Cast the pointer to uintptr_t before the arithmetic operation for portability.
    uintptr_t address = reinterpret_cast<uintptr_t>(ptr);
    uintptr_t offset = address - base_address;

    // Check if we have a valid shared object name.
    std::string module_name = dl_info.dli_fname ? dl_info.dli_fname : "Unknown";

    module_name = get_base_name(module_name);

    // Convert the offset to a string in hexadecimal form.
    char offset_str[32];
#if defined(__aarch64__)
    snprintf(offset_str, sizeof(offset_str), "0x%jx 0x%jx", static_cast<uintmax_t>(offset), static_cast<uintmax_t>(offset+0x100000));
#elif defined(__arm__)
    snprintf(offset_str, sizeof(offset_str), "0x%jx 0x%jx", static_cast<uintmax_t>(offset), static_cast<uintmax_t>(offset+0x1000));
#else
    snprintf(offset_str, sizeof(offset_str), "0x%jx", static_cast<uintmax_t>(offset));
#endif

    return module_name + "@" + offset_str;
}


