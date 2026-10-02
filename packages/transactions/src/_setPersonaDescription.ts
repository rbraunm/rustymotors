import { databaseProvider, getServerLogger } from "rusty-motors-shared";
import type { MessageHandlerArgs, MessageHandlerResult } from "./handlers.js";
import { connectionPersonaId, fixedText, successReply } from "./personaConnection.js";

const defaultLogger = getServerLogger("handlers/_setPersonaDescription");

/** The description field after the message number: 256 bytes, NUL-terminated when shorter. */
const descriptionFieldLength = 256;
const descriptionMaximumLength = descriptionFieldLength - 1;

/**
 * Handle MC_SET_PERSONA_DESCRIPTION (492), sent when the player saves the Edit Persona dialog.
 *
 * Request body: uint16 msgNo, then the description in a 256-byte field. The persona is the one on
 * this connection. The client treats a reply of MC_SUCCESS (101) or MC_PERSONA_DESCRIPTION_SET (494)
 * as saved, MC_FILTHY_TEXT (493) as rejected for its wording, and anything else as a failure. Until
 * a reply arrives the dialog shows "Please wait" and the client waits.
 */
export async function _setPersonaDescription({
	connectionId,
	packet,
	log = defaultLogger,
}: MessageHandlerArgs): Promise<MessageHandlerResult> {
	const request = packet.data;
	if (request.byteLength < 2 + descriptionFieldLength) {
		throw new Error(`MC_SET_PERSONA_DESCRIPTION is ${request.byteLength} bytes, too short for its description field`);
	}
	const description = fixedText(request.subarray(2, 2 + descriptionFieldLength));
	if (description.length > descriptionMaximumLength) {
		throw new Error(`MC_SET_PERSONA_DESCRIPTION's description has no NUL in its ${descriptionFieldLength} bytes`);
	}
	const personaId = connectionPersonaId(connectionId);
	await databaseProvider.getPersonaStore().setDescription(personaId, description);
	log.info(`Set the description of persona ${personaId} (${description.length} characters)`);
	return { connectionId, messages: [successReply(packet)] };
}
