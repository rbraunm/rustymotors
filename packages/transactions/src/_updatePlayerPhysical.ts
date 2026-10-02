import { databaseProvider, getServerLogger } from "rusty-motors-shared";
import type { MessageHandlerArgs, MessageHandlerResult } from "./handlers.js";
import { connectionPersonaId, successReply } from "./personaConnection.js";

const defaultLogger = getServerLogger("handlers/_updatePlayerPhysical");

// MC_UPDATE_PLAYER_PHYSICAL as MCity_d.exe builds it (0x97EBD0), little-endian: u16 msgNo, then
// player id, body type, and hair, skin, shirt, and pants colors as 32-bit ARGB, the layout of
// MC_PLAYER_PHYSICAL_INFO.
const requestByteLength = 2 + 6 * 4;

/**
 * Handle MC_UPDATE_PLAYER_PHYSICAL (266), which persona creation and the Edit Persona dialog send for
 * the connection's persona. The client waits on "Please wait" until the reply arrives.
 */
export async function _updatePlayerPhysical({
	connectionId,
	packet,
	log = defaultLogger,
}: MessageHandlerArgs): Promise<MessageHandlerResult> {
	const request = packet.data;
	if (request.byteLength !== requestByteLength) {
		throw new Error(`MC_UPDATE_PLAYER_PHYSICAL is ${request.byteLength} bytes, not ${requestByteLength}`);
	}
	const personaId = connectionPersonaId(connectionId);
	const playerId = request.readUInt32LE(2);
	if (playerId !== personaId) {
		throw new Error(`MC_UPDATE_PLAYER_PHYSICAL for player ${playerId} on persona ${personaId}'s connection`);
	}
	await databaseProvider.getPersonaStore().setPhysical(personaId, {
		bodyType: request.readInt32LE(6),
		hairColor: request.readInt32LE(10),
		skinColor: request.readInt32LE(14),
		shirtColor: request.readInt32LE(18),
		pantsColor: request.readInt32LE(22),
	});
	log.info(`Set the look of persona ${personaId}`);
	return { connectionId, messages: [successReply(packet)] };
}
