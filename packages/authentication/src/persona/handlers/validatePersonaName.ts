import type { BytableBuffer } from "@rustymotors/binary";
import { databaseProvider, getServerLogger, type LegacyMessage, type ServerLogger } from "rusty-motors-shared";
import { isRequestFromCustomer } from "../customerAccess.js";
import { NpsBodyReader, npsReply } from "../npsWire.js";

// NPSValidatePersonaName's replies (MCity_d.exe 0xAA4110): 0x601 or 0x207 is a usable name,
// 0x20A is taken, 0x635 has invalid characters.
const nameAvailableReply = 0x601;
const nameTakenReply = 0x20a;
const invalidCharactersReply = 0x635;
const invalidUserReply = 0x602;

// The client's create dialog trims spaces and keeps at most 10 characters.
export const personaNameMaximumLength = 10;
const personaNamePattern = /^[\x21-\x7e]([\x20-\x7e]*[\x21-\x7e])?$/;

/** Whether a name is one the client's create dialog can produce. */
export function isPersonaNameWellFormed(name: string): boolean {
	return name.length <= personaNameMaximumLength && personaNamePattern.test(name);
}

/**
 * Checks a new persona's name (0x533; body u32 customer id, then the name and the game name,
 * each a u16 length and bytes).
 */
export async function validatePersonaName({
	connectionId,
	message,
	log = getServerLogger("PersonaServer/validatePersonaName"),
}: {
	connectionId: string;
	message: LegacyMessage;
	log?: ServerLogger;
}): Promise<{
	connectionId: string;
	messages: BytableBuffer[];
}> {
	const body = NpsBodyReader.of(message._doSerialize());
	const customerId = body.u32();
	const name = body.lengthPrefixedString(0x20);
	const gameName = body.lengthPrefixedString(0x40);
	if (!isRequestFromCustomer(customerId)) {
		log.warn(`Name check for customer ${customerId} refused: not from the address that logged in as it`);
		return { connectionId, messages: [npsReply(invalidUserReply)] };
	}
	let reply = nameAvailableReply;
	if (!isPersonaNameWellFormed(name)) {
		reply = invalidCharactersReply;
	} else if (await databaseProvider.getPersonaStore().isPersonaNameTaken(name)) {
		reply = nameTakenReply;
	}
	log.info(`Persona name check for customer ${customerId} in ${gameName}: reply 0x${reply.toString(16)}`);
	return { connectionId, messages: [npsReply(reply)] };
}
