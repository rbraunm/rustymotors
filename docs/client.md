# Configuring the client to connect to the server

~**Important!:** You must use a newer version of Windows. Windows XP is unable to use the encryption ciphers needed to talk to the server~

You are probably best off using XP. Since the encryption ciphers used by the client are so weak, Anything higher might have a fit. Hence the SSLProxy container.

---

This currently has only been tested with the debug version of the client. If you don't have those files and instructions the server _might_ work, but is not currently supported.

## Registry

-   No registry import: the fordite client tools (registryGuard) serve every key the client reads from `Ammolite\registry.ini` in the game folder, where the server is set.

### Client/Server Encryption Setup

-   No pub.key and no certificate import: the login certificate must come from a public CA, with an RSA key of at most 2048 bits. The client tools (stabilityGuard `loginKeyFromCertificate`) validate it against the Windows certificate store and encrypt the login's session key with its key; the server decrypts it with `PRIVATE_KEY_FILE`, the certificate's private key.

### Change the graphics settings

In <game dir>\SaveData\options.ini, change the value `graphicsModeIndex=<value>`, according to resolution list:

-   `0` for 640x480
-   `1` for 800x600
-   `2` for 1024x768
-   `3` for 1152x864
-   `4` for 1280x960

### Disable the movies

You can delete the `<game dir>\Data\Movies` folder, or start the game with parameter `-nomovie` (_Create a shortcut for debug executable_).

### Windows 10 Compatibility settings

Please note, I'm not convinced this works anymore, I went back to my XP install.

-   Disable fullscreen (In some cases, fullscreen will work fine, to switch between window and fullscreen modes use Alt+Enter buttons).

-   Tell Windows to run in 16-bit color mode
