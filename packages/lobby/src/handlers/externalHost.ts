import { configurationProvider } from "rusty-motors-shared";

/**
 * The address clients are told to connect to for chat and race servers: this
 * server's own configured external host (EXTERNAL_HOST). Throws when it is not
 * set, since any other answer would send clients to the wrong machine.
 */
export function getExternalHost(): string {
    const host = configurationProvider.getSharedConfiguration().host;
    if (!host) {
        throw new Error(
            "EXTERNAL_HOST is not set; clients cannot be told where the chat and race servers are",
        );
    }
    return host;
}
