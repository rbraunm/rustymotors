import type { BytableBuffer } from "@rustymotors/binary";
import { getServerLogger, isPlateTextWellFormed, type LegacyMessage, type ServerLogger } from "rusty-motors-shared";
import { NpsBodyReader, npsReply } from "../npsWire.js";

// NPSCheckToken's replies (MCity_d.exe 0xAA5810): 0x207 is acceptable, 0x635 has invalid characters.
const tokenAcceptedReply = 0x207;
const invalidCharactersReply = 0x635;

/**
 * Checks a text token, which the create dialog sends for the license plate (0x534; body u32 flags
 * naming the checks wanted, then the text as a u16 length and bytes).
 */
export async function checkToken({
	connectionId,
	message,
	log = getServerLogger("PersonaServer/checkToken"),
}: {
	connectionId: string;
	message: LegacyMessage;
	log?: ServerLogger;
}): Promise<{
	connectionId: string;
	messages: BytableBuffer[];
}> {
	const body = NpsBodyReader.of(message._doSerialize());
	const checks = body.u32();
	const text = body.lengthPrefixedString(0x40);
	const reply = isPlateTextWellFormed(text) ? tokenAcceptedReply : invalidCharactersReply;
	log.info(`Token check (checks 0x${checks.toString(16)}): reply 0x${reply.toString(16)}`);
	return { connectionId, messages: [npsReply(reply)] };
}
