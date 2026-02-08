/*
 * AvatarEngine_launcher.c
 * Compile to AvatarEngine_launcher.exe for ChessBase/Fritz when .bat is not accepted.
 * MinGW: gcc -o AvatarEngine_launcher.exe AvatarEngine_launcher.c
 * MSVC: cl AvatarEngine_launcher.c
 */
#ifdef _WIN32
#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    char exePath[MAX_PATH];
    char dir[MAX_PATH];
    char *lastSlash;
    char pythonCmd[MAX_PATH + 64];
    STARTUPINFOA si = { sizeof(si) };
    PROCESS_INFORMATION pi = { 0 };

    if (GetModuleFileNameA(NULL, exePath, MAX_PATH) == 0)
        return 1;
    exePath[MAX_PATH - 1] = '\0';
    lastSlash = strrchr(exePath, '\\');
    if (lastSlash) {
        *lastSlash = '\0';
        strncpy(dir, exePath, MAX_PATH - 1);
        dir[MAX_PATH - 1] = '\0';
    } else
        dir[0] = '\0';

    if (!SetCurrentDirectoryA(dir))
        return 2;

    /* python -u AvatarEngine.py (unbuffered for UCI) */
    snprintf(pythonCmd, sizeof(pythonCmd), "python -u \"%s\\AvatarEngine.py\"", dir);
    pythonCmd[sizeof(pythonCmd) - 1] = '\0';

    if (!CreateProcessA(NULL, pythonCmd, NULL, NULL, TRUE, 0, NULL, dir, &si, &pi)) {
        /* Try "py" launcher if "python" not in PATH */
        snprintf(pythonCmd, sizeof(pythonCmd), "py -3 -u \"%s\\AvatarEngine.py\"", dir);
        pythonCmd[sizeof(pythonCmd) - 1] = '\0';
        if (!CreateProcessA(NULL, pythonCmd, NULL, NULL, TRUE, 0, NULL, dir, &si, &pi))
            return 3;
    }

    WaitForSingleObject(pi.hProcess, INFINITE);
    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
    return 0;
}
#else
int main(void) { return 0; }
#endif
