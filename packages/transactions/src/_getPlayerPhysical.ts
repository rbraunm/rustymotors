import { OldServerMessage, databaseProvider, getServerLogger } from "rusty-motors-shared";
import { GenericRequestMessage } from "./GenericRequestMessage.js";
import { PlayerPhysicalMessage } from "./PlayerPhysicalMessage.js";
import type { MessageHandlerArgs, MessageHandlerResult } from "./handlers.js";

const defaultLogger = getServerLogger("handlers/_getPlayerPhysical");

/** Handle MC_GET_PLAYER_PHYSICAL (264): a persona's look, answered with MC_PLAYER_PHYSICAL_INFO (265). */
export async function _getPlayerPhysical({
	connectionId,
	packet,
	log = defaultLogger,
}: MessageHandlerArgs): Promise<MessageHandlerResult> {
	const getPlayerPhysicalMessage = new GenericRequestMessage();
	getPlayerPhysicalMessage.deserialize(packet.data);
	const playerId = getPlayerPhysicalMessage.data.readUInt32LE(0);

	const player = await databaseProvider.getPersonaStore().findPlayer(playerId);
	if (typeof player === "undefined") {
		throw new Error(`MC_GET_PLAYER_PHYSICAL for player ${playerId}, who is not a live persona`);
	}

	const playerPhysicalMessage = new PlayerPhysicalMessage();
	playerPhysicalMessage._msgNo = 265;
	playerPhysicalMessage._playerId = playerId;
	playerPhysicalMessage._bodytype = player.physical.bodyType;
	playerPhysicalMessage._hairColor = player.physical.hairColor;
	playerPhysicalMessage._skinColor = player.physical.skinColor;
	playerPhysicalMessage._shirtColor = player.physical.shirtColor;
	playerPhysicalMessage._pantsColor = player.physical.pantsColor;

	log.debug(`[${connectionId}] Sending PlayerPhysicalMessage: ${playerPhysicalMessage.toString()}`);

	const responsePacket = new OldServerMessage();
	responsePacket._header.sequence = packet.sequenceNumber;
	responsePacket._header.flags = 8;
	responsePacket.setBuffer(playerPhysicalMessage.serialize());
	return { connectionId, messages: [responsePacket] };
}
