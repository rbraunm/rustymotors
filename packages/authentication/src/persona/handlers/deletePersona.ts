import type { BytableBuffer } from "@rustymotors/binary";
import { databaseProvider, getServerLogger, type LegacyMessage, type ServerLogger } from "rusty-motors-shared";
import { isRequestFromCustomer } from "../customerAccess.js";
import { NpsBodyReader, npsReply } from "../npsWire.js";

// NPSDeleteGamePersona's replies (MCity_d.exe 0xAB3570): 0x60C deleted, 0x602 no such user.
// There is no wait after creation, so 0x624 (seconds left) is never sent.
const personaDeletedReply = 0x60c;
const invalidUserReply = 0x602;

/** Deletes a persona (0x512; body u32 customer id, u32 GameUserId). */
export async function deletePersona({
	connectionId,
	message,
	log = getServerLogger("PersonaServer/deletePersona"),
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
	const personaId = body.u32();
	if (!isRequestFromCustomer(customerId)) {
		log.warn(`Persona delete for customer ${customerId} refused: not from the address that logged in as it`);
		return { connectionId, messages: [npsReply(invalidUserReply)] };
	}
	if (!(await databaseProvider.getPersonaStore().deletePersona(customerId, personaId))) {
		log.warn(`Persona delete for customer ${customerId}: it has no live persona ${personaId}`);
		return { connectionId, messages: [npsReply(invalidUserReply)] };
	}
	log.info(`Deleted persona ${personaId} of customer ${customerId}`);
	return { connectionId, messages: [npsReply(personaDeletedReply)] };
}
