import {
	OldServerMessage,
	databaseProvider,
	getServerLogger,
	personaLevel,
	personaPointsToNextLevel,
	personaRank,
} from "rusty-motors-shared";
import { GenericRequestMessage } from "./GenericRequestMessage.js";
import { PlayerInfoMessage } from "./PlayerInfoMessage.js";
import type { MessageHandlerArgs, MessageHandlerResult } from "./handlers.js";

const defaultLogger = getServerLogger("handlers/_getPlayerInfo");

/** Handle MC_GET_PLAYER_INFO (108): a persona's game data. */
export async function _getPlayerInfo({
	connectionId,
	packet,
	log = defaultLogger,
}: MessageHandlerArgs): Promise<MessageHandlerResult> {
	const getPlayerInfoMessage = new GenericRequestMessage();
	getPlayerInfoMessage.deserialize(packet.data);
	const playerId = getPlayerInfoMessage.data.readUInt32LE(0);

	const player = await databaseProvider.getPersonaStore().findPlayer(playerId);
	if (typeof player === "undefined") {
		throw new Error(`MC_GET_PLAYER_INFO for player ${playerId}, who is not a live persona`);
	}

	const playerInfoMessage = new PlayerInfoMessage();
	playerInfoMessage._msgNo = 108;
	playerInfoMessage._playerId = playerId;
	playerInfoMessage._playerName = player.name;
	playerInfoMessage._bankBalance = player.bankBalance;
	playerInfoMessage._numberOfVehicles = player.carsOwned;
	playerInfoMessage._carsList = player.carNumbers;
	playerInfoMessage._licensesPlateCode = player.plateCode;
	playerInfoMessage._licensesPlateText = player.plateText;
	playerInfoMessage._carInfoSetttings = player.carInfoSetting;
	playerInfoMessage._playerDescription = player.description;
	playerInfoMessage._currentLevel = personaLevel;
	playerInfoMessage._currentRank = personaRank;
	playerInfoMessage._currentClub = 0;
	playerInfoMessage._maxInventorySlots = 100;
	playerInfoMessage._numberOfInventorySlotsUsed = 0;
	playerInfoMessage._numberOfPointsToNextLevel = personaPointsToNextLevel;

	log.debug(`[${connectionId}] Sending PlayerInfoMessage: ${playerInfoMessage.toString()}`);

	const responsePacket = new OldServerMessage();
	responsePacket._header.sequence = packet.sequenceNumber;
	responsePacket._header.flags = 8;
	responsePacket.setBuffer(playerInfoMessage.serialize());
	return { connectionId, messages: [responsePacket] };
}
