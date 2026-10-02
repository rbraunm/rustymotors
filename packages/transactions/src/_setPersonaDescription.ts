import { OldServerMessage, getServerLogger } from "rusty-motors-shared";
import { GenericReplyMessage } from "./GenericReplyMessage.js";
import type { MessageHandlerArgs, MessageHandlerResult } from "./handlers.js";

const defaultLogger = getServerLogger("handlers/_setPersonaDescription");

/** The description field after the message number: 256 bytes, NUL-terminated when shorter. */
const descriptionFieldLength = 256;

/**
 * Handle MC_SET_PERSONA_DESCRIPTION (492), sent when the player saves the Edit
 * Persona dialog.
 *
 * Request body: uint16 msgNo, then the description in a 256-byte field. The
 * persona is the one on this connection. The client treats a reply of
 * MC_SUCCESS (101) or MC_PERSONA_DESCRIPTION_SET (494) as saved, MC_FILTHY_TEXT
 * (493) as rejected for its wording, and anything else as a failure. Until a
 * reply arrives the dialog shows "Please wait" and the client waits.
 *
 * The description is not stored yet: nothing in the server serves it back to
 * clients.
 */
export async function _setPersonaDescription({
	connectionId,
	packet,
	log = defaultLogger,
}: MessageHandlerArgs): Promise<MessageHandlerResult> {
	if (packet.data.byteLength < 2) {
		throw new Error(
			`[${connectionId}] MC_SET_PERSONA_DESCRIPTION is ${packet.data.byteLength} bytes, too short for a message number`,
		);
	}
	const field = packet.data.subarray(2, 2 + descriptionFieldLength);
	const terminator = field.indexOf(0);
	const descriptionLength = terminator === -1 ? field.byteLength : terminator;
	log.debug(
		`[${connectionId}] Set persona description (${descriptionLength} characters)`,
	);

	const reply = new GenericReplyMessage();
	reply.msgNo = 101; // MC_SUCCESS
	reply.msgReply = 492; // MC_SET_PERSONA_DESCRIPTION

	const responsePacket = new OldServerMessage();
	responsePacket._header.sequence = packet.sequenceNumber;
	responsePacket._header.flags = 8;
	responsePacket.setBuffer(reply.serialize());
	return { connectionId, messages: [responsePacket] };
}
