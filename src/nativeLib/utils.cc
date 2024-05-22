
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ftw.h>

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

