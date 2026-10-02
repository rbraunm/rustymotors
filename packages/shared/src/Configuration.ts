import type { ServerLogger } from "@rustymotors/logging";
import { getServerLogger } from "../getServerLogger.js";

/**
 * @module shared/Configuration
 * @exports Configuration
 */

export class Configuration {
	certificateFile!: string;
	privateKeyFile!: string;
	publicKeyFile!: string;
	host!: string;
	logLevel!: string;
	static instance: Configuration | undefined;

	/**
	 * Constructs a new Configuration instance.
	 *
	 * @param {Object} params - The configuration parameters.
	 * @param {string} params.host - The host address.
	 * @param {string} params.certificateFile - The path to the certificate file.
	 * @param {string} params.privateKeyFile - The path to the private key file.
	 * @param {string} params.publicKeyFile - The path to the public key file.
	 * @param {string} params.logLevel - The logging level.
	 * @param {Logger} params.logger - The logger instance.
	 */
	constructor({
		host,
		certificateFile,
		privateKeyFile,
		publicKeyFile,
		logLevel,
		logger,
	}: {
		host: string;
		certificateFile: string;
		privateKeyFile: string;
		publicKeyFile: string;
		logLevel: string;
		logger: ServerLogger;
	}) {
		try {
			this.certificateFile = certificateFile;

			this.privateKeyFile = privateKeyFile;

			this.publicKeyFile = publicKeyFile;

			this.host = host;

			this.logLevel = logLevel.toLowerCase();
			Configuration.instance = this;
		} catch (error) {
			logger.error("Error in core server", { err: error });
		}
	}

	/**
	 * Creates a new instance of the Configuration class.
	 *
	 * @param host - The host address.
	 * @param certificateFile - The path to the certificate file.
	 * @param privateKeyFile - The path to the private key file.
	 * @param publicKeyFile - The path to the public key file.
	 * @param logLevel - The logging level.
	 * @param logger - The logger instance.
	 * @returns A new Configuration instance.
	 */
	static newInstance({
		host,
		certificateFile,
		privateKeyFile,
		publicKeyFile,
		logLevel,
		logger,
	}: {
		host: string;
		certificateFile: string;
		privateKeyFile: string;
		publicKeyFile: string;
		logLevel: string;
		logger: ServerLogger;
	}): Configuration {
		return new Configuration({
			host,
			certificateFile,
			privateKeyFile,
			publicKeyFile,
			logLevel,
			logger,
		});
	}

	/**
	 * Returns the singleton instance of the Configuration class.
	 *
	 * @throws {Error} If the Configuration instance has not been initialized using newInstance.
	 * @returns {Configuration} The singleton instance of the Configuration class.
	 */
	static getInstance(): Configuration {
		if (typeof Configuration.instance === "undefined") {
			throw new Error(
				"Configuration needs to be initialized using newInstance",
			);
		}

		return Configuration.instance;
	}
}

function getEnvVariable(
	name: string,
	required: boolean,
	defaultValue?: string,
): string {
	const value = process.env[name];
	if (required && !value) {
		const coreLogger = getServerLogger("core");
		coreLogger.error(`Missing required environment variable: ${name}`);
		process.exit(1);
	}
	return value || defaultValue || "";
}

export function getServerConfiguration(): Configuration {
	return {
		host: getEnvVariable("EXTERNAL_HOST", false, ""),
		certificateFile: getEnvVariable("CERTIFICATE_FILE", true),
		privateKeyFile: getEnvVariable("PRIVATE_KEY_FILE", true),
		publicKeyFile: getEnvVariable("PUBLIC_KEY_FILE", true),
		logLevel: getEnvVariable("MCO_LOG_LEVEL", false, "debug"),
	};
}

/**
 * The origin clients use for this server's plain-HTTP endpoints (shard list,
 * patch server, game URLs): http://<host>, plus :EXTERNAL_WEB_PORT when that is
 * set to anything but 80. Throws when the host is empty or the port is not a
 * valid TCP port, since any other answer would send clients to the wrong place.
 */
export function getExternalWebOrigin(host: string): string {
	if (!host) {
		throw new Error("EXTERNAL_HOST is not set; clients cannot be told where this server's web endpoints are");
	}
	const portText = getEnvVariable("EXTERNAL_WEB_PORT", false, "80");
	const port = Number(portText);
	if (!/^[0-9]+$/.test(portText) || port < 1 || port > 65535) {
		throw new Error(`EXTERNAL_WEB_PORT must be a TCP port from 1 to 65535, got '${portText}'`);
	}
	return port === 80 ? `http://${host}` : `http://${host}:${port}`;
}

/** The race server at the base, then chat channels 1 to 20 at the ports after it. */
const gameRoomPortCount = 21;
/** Ports with fixed jobs, which the game room range must not overlap. */
const fixedServerPorts = [3000, 6660, 7003, 8226, 8227, 8228, 10001, 43200, 43300, 43400, 53303];

/**
 * The game room ports the server listens on and tells clients to connect to:
 * the race server at GAME_ROOM_PORT_BASE (default 9000, upstream's), then chat
 * channels 1 to 20 on the ports after it. Clients learn every one of these from
 * the server, so the range can move. Throws when the range runs past 65535 or
 * overlaps one of the server's fixed ports.
 */
export function getGameRoomPorts(): number[] {
	const baseText = getEnvVariable("GAME_ROOM_PORT_BASE", false, "9000");
	const base = Number(baseText);
	if (!/^[0-9]+$/.test(baseText) || base < 1 || base + gameRoomPortCount - 1 > 65535) {
		throw new Error(
			`GAME_ROOM_PORT_BASE must leave room for ${gameRoomPortCount} ports up to 65535, got '${baseText}'`,
		);
	}
	const ports = Array.from({ length: gameRoomPortCount }, (_, index) => base + index);
	const overlap = ports.find((port) => fixedServerPorts.includes(port));
	if (overlap !== undefined) {
		throw new Error(`GAME_ROOM_PORT_BASE ${base} puts game room port ${overlap} on one of the server's fixed ports`);
	}
	return ports;
}
