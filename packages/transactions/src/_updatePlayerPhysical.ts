import { OldServerMessage, getServerLogger } from "rusty-motors-shared";
import { GenericReplyMessage } from "./GenericReplyMessage.js";
import type { MessageHandlerArgs, MessageHandlerResult } from "./handlers.js";

const defaultLogger = getServerLogger("handlers/_updatePlayerPhysical");

/** msgNo, then player id, body type, and hair, skin, shirt, and pants colors: seven 4-byte fields after the 2-byte msgNo. */
const requestByteLength = 2 + 7 * 4;

/**
 * Handle MC_UPDATE_PLAYER_PHYSICAL (266), sent with MC_SET_PERSONA_DESCRIPTION
 * when the player saves the Edit Persona dialog.
 *
 * Request body (little-endian): uint16 msgNo, uint32 playerId, uint32 bodyType,
 * then hair, skin, shirt, and pants colors as uint32 ARGB, the same layout as
 * PlayerPhysicalMessage. The client completes the save when the reply is a
 * generic MC_SUCCESS carrying the request's sequence number, and waits on
 * "Please wait" until one arrives.
 *
 * The appearance is not stored yet: personas are not in the player table, so
 * MC_GET_PLAYER_PHYSICAL still answers with its fixed colors.
 */
export async function _updatePlayerPhysical({
	connectionId,
	packet,
	log = defaultLogger,
}: MessageHandlerArgs): Promise<MessageHandlerResult> {
	if (packet.data.byteLength < requestByteLength) {
		throw new Error(
			`[${connectionId}] MC_UPDATE_PLAYER_PHYSICAL is ${packet.data.byteLength} bytes, expected at least ${requestByteLength}`,
		);
	}
	const playerId = packet.data.readUInt32LE(2);
	const bodyType = packet.data.readUInt32LE(6);
	const colors = [10, 14, 18, 22].map((offset) =>
		packet.data.readUInt32LE(offset).toString(16).padStart(8, "0"),
	);
	log.debug(
		`[${connectionId}] Update player physical: player ${playerId} body ${bodyType} hair ${colors[0]} skin ${colors[1]} shirt ${colors[2]} pants ${colors[3]}`,
	);

	const reply = new GenericReplyMessage();
	reply.msgNo = 101; // MC_SUCCESS
	reply.msgReply = 266; // MC_UPDATE_PLAYER_PHYSICAL

	const responsePacket = new OldServerMessage();
	responsePacket._header.sequence = packet.sequenceNumber;
	responsePacket._header.flags = 8;
	responsePacket.setBuffer(reply.serialize());
	return { connectionId, messages: [responsePacket] };
}
