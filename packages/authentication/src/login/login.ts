import { NetworkMessage, configurationProvider, databaseProvider } from "rusty-motors-shared";
import { NPSUserStatus } from "./NPSUserStatus.js";
import { type ServerLogger, getServerLogger } from "rusty-motors-shared";
import { GamePacket } from "rusty-motors-protocol";
import type { BytableMessage } from "@rustymotors/binary";


/**
 * Process a UserLogin packet
 * @private
 * @param {object} args
 * @param {string} args.connectionId
 * @param {BytableMessage} args.message
 * @param {ServerLogger} [args.log=getServerLogger("LoginServer")]
 * @returns {Promise<{
 *  connectionId: string,
 * messages: BytableBuffer[],
 * }>}
 */
export async function login({
	connectionId,
	message,
	log = getServerLogger( "LoginServer"),
}: {
	connectionId: string;
	message: BytableMessage;
	log?: ServerLogger;
}): Promise<{
	connectionId: string;
	messages: GamePacket[];
}> {
	const data = message.serialize();

	// Get configuration from provider (uses GatewayConfiguration if available, otherwise falls back)
	const config = configurationProvider.getSharedConfiguration();
	const userStatus = new NPSUserStatus(data, config, log);

	userStatus.extractSessionKeyFromPacket(data);

	const { contextId, sessionKey } = userStatus;

	log.debug(`[${connectionId}] Context ID: ${contextId}`);
	userStatus.dumpPacket();

	// Load the customer record by contextId
	const authStore = databaseProvider.getAuthStore();
	const userRecord = authStore.findCustomerByContext(contextId);

	if (typeof userRecord === "undefined") {
		// We were not able to locate the user's record
		throw Error(
			`[${connectionId}] Unable to locate user record for contextId: ${contextId}`,
		);
	}

	// Save sessionkey in database under customerId
	const sessionStore = databaseProvider.getSessionStore();
	await sessionStore.updateSessionKey(
		userRecord.customerId,
		sessionKey ?? "",
		contextId,
		connectionId,
	).catch((error) => {
		const err = Error(
			`[${connectionId}] Error updating session key in the database`,
			{ cause: error },
		);
		throw err;
	});

	const outboundMessage = new NetworkMessage(0x601);

	// The body in the layout MCity_d.exe parses (NPSUserLogin, 0x601 case: object vtable
	// 0x11FECD8, body reader 0xABDA10). Nested records are read field by field and then
	// skipped by their length prefix, so each prefix must equal the record's real size;
	// a short or unprefixed body sends the client's read cursor past the message.
	//   u32 customerId, u32 profileId, u8 isCacheHit,
	//   u16 length + ban record, u16 length + gag record, u16 length + key record,
	//   u32 (0), u16 length + string of up to 64 bytes (empty).
	// Ban and gag records (reader 0xABD4C0): u32, u32 start, u32 end, then u16-length
	// strings of up to 64, 256, and 256 bytes. The client treats a record as active
	// when start is nonzero and end is zero or in the future (0xABD700), so all zeros
	// means not banned and not gagged.
	// Key record (reader 0xAA7790): u16-length string of up to 32 bytes, u32. Its use
	// is not mapped yet; it is sent empty, which the client parses cleanly.
	const lengthPrefixed = (content: Buffer): Buffer => {
		const prefix = Buffer.alloc(2);
		prefix.writeUInt16BE(content.length, 0);
		return Buffer.concat([prefix, content]);
	};
	const emptyString = lengthPrefixed(Buffer.alloc(0));
	const inactiveRecord = lengthPrefixed(
		Buffer.concat([Buffer.alloc(12), emptyString, emptyString, emptyString]),
	);
	const emptyKeyRecord = lengthPrefixed(Buffer.concat([emptyString, Buffer.alloc(4)]));
	const identity = Buffer.alloc(9);
	identity.writeInt32BE(userRecord.customerId, 0);
	identity.writeInt32BE(userRecord.profileId, 4);
	identity.writeUInt8(0, 8); // isCacheHit
	const dataBuffer = Buffer.concat([
		identity,
		inactiveRecord, // ban
		inactiveRecord, // gag
		emptyKeyRecord,
		Buffer.alloc(4),
		emptyString,
	]);

	const packetContent = dataBuffer;

	// Set the packet content in the outbound message
	outboundMessage.data = packetContent;

	const outboundMessage2 = new GamePacket();
	outboundMessage2.deserialize(outboundMessage.serialize());


	// Update the data buffer
	const response = {
		connectionId,
		messages: [outboundMessage2, outboundMessage2],
	};
	log.debug(
		`[${connectionId}] Leaving login with ${response.messages.length} messages`,
	);
	return response;
}



