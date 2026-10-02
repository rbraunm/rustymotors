import { databaseProvider, getServerLogger, isPlateTextWellFormed } from "rusty-motors-shared";
import type { MessageHandlerArgs, MessageHandlerResult } from "./handlers.js";
import { connectionPersonaId, fixedText, successReply } from "./personaConnection.js";

const defaultLogger = getServerLogger("handlers/_setOptions");

// MC_SET_OPTIONS as MCity_d.exe builds it (0x97C260), little-endian: u16 msgNo, u16 plate code
// (region << 8 | locale), char[8] plate text, u32 car info setting, then six char[3] car numbers.
const requestByteLength = 34;
const carNumberOffset = 16;
const carNumberFieldLength = 3;
const carNumberCount = 6;
const carNumberPattern = /^[\x20-\x7e]{0,2}$/;

/**
 * Handle MC_SET_OPTIONS (109), which sets the connection's persona's license plate, car info
 * setting, and car numbers; persona creation sends it right after the persona is made.
 */
export async function _setOptions({
	connectionId,
	packet,
	log = defaultLogger,
}: MessageHandlerArgs): Promise<MessageHandlerResult> {
	const request = packet.data;
	if (request.byteLength !== requestByteLength) {
		throw new Error(`MC_SET_OPTIONS is ${request.byteLength} bytes, not ${requestByteLength}`);
	}
	const plateText = fixedText(request.subarray(4, 12));
	if (plateText !== "" && !isPlateTextWellFormed(plateText)) {
		throw new Error(`MC_SET_OPTIONS carries a plate text the client cannot produce: ${JSON.stringify(plateText)}`);
	}
	const carNumbers = Array.from({ length: carNumberCount }, (_, index) => {
		const start = carNumberOffset + index * carNumberFieldLength;
		return fixedText(request.subarray(start, start + carNumberFieldLength));
	});
	const badCarNumber = carNumbers.find((carNumber) => !carNumberPattern.test(carNumber));
	if (typeof badCarNumber !== "undefined") {
		throw new Error(`MC_SET_OPTIONS carries a malformed car number: ${JSON.stringify(badCarNumber)}`);
	}
	const personaId = connectionPersonaId(connectionId);
	await databaseProvider.getPersonaStore().setOptions(personaId, {
		plateCode: request.readUInt16LE(2),
		plateText,
		carInfoSetting: request.readUInt32LE(12),
		carNumbers,
	});
	log.info(`Set options for persona ${personaId}`);
	return { connectionId, messages: [successReply(packet)] };
}
