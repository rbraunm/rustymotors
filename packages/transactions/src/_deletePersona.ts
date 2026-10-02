import { databaseProvider, getServerLogger } from "rusty-motors-shared";
import { GenericRequestMessage } from "./GenericRequestMessage.js";
import type { MessageHandlerArgs, MessageHandlerResult } from "./handlers.js";
import { connectionPersonaId, successReply } from "./personaConnection.js";

const defaultLogger = getServerLogger("handlers/_deletePersona");

/**
 * Handle MC_DELETE_PERSONA (320; u16 msgNo, u32 persona id), the game-data delete the client sends
 * (MCity_d.exe 0x980E80) on a connection made as the persona, right after its NPS delete (0x512).
 * That delete already retired the whole persona, game data included (its player row is a Deleted
 * Player), so this checks that it did. The client does not wait for the reply.
 */
export async function _deletePersona({
	connectionId,
	packet,
	log = defaultLogger,
}: MessageHandlerArgs): Promise<MessageHandlerResult> {
	const request = new GenericRequestMessage();
	request.deserialize(packet.data);
	const personaId = request.data.readUInt32LE(0);
	const connectedPersonaId = connectionPersonaId(connectionId);
	if (personaId !== connectedPersonaId) {
		throw new Error(`MC_DELETE_PERSONA for persona ${personaId} on persona ${connectedPersonaId}'s connection`);
	}
	if (typeof (await databaseProvider.getPersonaStore().findPersona(personaId)) !== "undefined") {
		throw new Error(`MC_DELETE_PERSONA for persona ${personaId}, which the NPS delete has not deleted`);
	}
	log.info(`Persona ${personaId}'s game data went with its NPS delete`);
	return { connectionId, messages: [successReply(packet)] };
}
