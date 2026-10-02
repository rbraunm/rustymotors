import type { IServerMessage } from "rusty-motors-protocol";
import { fetchStateFromDatabase, findSessionByConnectionId, OldServerMessage } from "rusty-motors-shared";
import { GenericReplyMessage } from "./GenericReplyMessage.js";

const MC_SUCCESS = 101;
const MC_FAILED = 102;

/** The persona this MCOTS connection connected as (MC_CLIENT_CONNECT_MSG); throws before it has connected. */
export function connectionPersonaId(connectionId: string): number {
	const session = findSessionByConnectionId(fetchStateFromDatabase(), connectionId);
	if (typeof session === "undefined") {
		throw new Error(`Connection ${connectionId} has not connected as a persona`);
	}
	return session.gameId;
}

function genericReply(request: IServerMessage, msgNo: number, data?: Buffer): OldServerMessage {
	const reply = new GenericReplyMessage();
	reply.msgNo = msgNo;
	reply.msgReply = request.data.readUInt16LE(0);
	if (typeof data !== "undefined") {
		reply.setData(data);
	}
	const responsePacket = new OldServerMessage();
	responsePacket._header.sequence = request.sequenceNumber;
	responsePacket._header.flags = 8;
	responsePacket.setBuffer(reply.serialize());
	return responsePacket;
}

/** MC_SUCCESS answering the request, with its sequence number; data fills the reply's data field. */
export function successReply(request: IServerMessage, data?: Buffer): OldServerMessage {
	return genericReply(request, MC_SUCCESS, data);
}

/** MC_FAILED answering the request, for a refusal the client has its own path for. */
export function failedReply(request: IServerMessage): OldServerMessage {
	return genericReply(request, MC_FAILED);
}

/** A fixed-width text field: the bytes up to the first NUL. */
export function fixedText(field: Buffer): string {
	const terminator = field.indexOf(0);
	return field.subarray(0, terminator === -1 ? field.byteLength : terminator).toString("latin1");
}
