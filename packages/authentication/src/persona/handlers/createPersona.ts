import type { BytableBuffer } from "@rustymotors/binary";
import {
	databaseProvider,
	getServerLogger,
	isRequestFromCustomer,
	maximumPersonasPerCustomer,
	type LegacyMessage,
	type ServerLogger,
} from "rusty-motors-shared";
import { NpsBodyReader, npsReply, u32 } from "../npsWire.js";
import { gamePersonaRecord } from "../gamePersonaRecord.js";
import { isPersonaNameWellFormed } from "./validatePersonaName.js";

// NPSCreateGamePersona's replies (MCity_d.exe 0xAB5A80).
const personaCreatedReply = 0x601;
const invalidUserReply = 0x602;
const nameTakenReply = 0x20a;
const personaLimitReply = 0x612;
const invalidCharactersReply = 0x635;
const creationDisabledOnShardReply = 0x641;

// The shards the shard list offers (rusty-motors-shard, generateShardList): The Clocktower.
const openShardIds = [44];

type CreateRequest = { customerId: number; name: string; shardId: number; gameName: string };

/**
 * The create request: the client's whole persona record, then the game name. Only the customer, the
 * name, and the shard carry anything; the client sends the rest empty, plus 3 bytes it never set.
 */
function readCreateRequest(request: Buffer): CreateRequest {
	const body = NpsBodyReader.of(request);
	const customerId = body.u32();
	const name = body.lengthPrefixedString(0x20);
	body.u32(); // server id
	body.u32(); // creation stamp
	body.u32(); // last login stamp
	body.u32(); // number of games
	body.u32(); // GameUserId
	body.u16(); // online
	body.u32(); // game purchase stamp
	body.lengthPrefixedString(0x20); // serial number
	body.u32(); // time online
	body.u32(); // time in game
	body.lengthPrefixedString(0x200); // game blob
	body.lengthPrefixedString(0x100); // personal blob
	body.lengthPrefixedString(0x190); // picture blob (the client fills it from its key buffer)
	body.u8(); // do not disturb
	body.u32(); // game start stamp
	body.lengthPrefixedString(0x190); // current key
	body.u16(); // profile level
	const shardId = body.u32();
	const gameName = body.lengthPrefixedString(0x40);
	return { customerId, name, shardId, gameName };
}

/** Creates a persona (0x507), answering 0x601 with its record or the client's reason it was not made. */
export async function createPersona({
	connectionId,
	message,
	log = getServerLogger("PersonaServer/createPersona"),
}: {
	connectionId: string;
	message: LegacyMessage;
	log?: ServerLogger;
}): Promise<{
	connectionId: string;
	messages: BytableBuffer[];
}> {
	const { customerId, name, shardId, gameName } = readCreateRequest(message._doSerialize());
	if (!isRequestFromCustomer(customerId)) {
		log.warn(`Persona create for customer ${customerId} refused: not from the address that logged in as it`);
		return { connectionId, messages: [npsReply(invalidUserReply)] };
	}
	if (!openShardIds.includes(shardId)) {
		log.warn(`Persona create for customer ${customerId} refused: shard ${shardId} is not open`);
		return { connectionId, messages: [npsReply(creationDisabledOnShardReply)] };
	}
	if (!isPersonaNameWellFormed(name)) {
		return { connectionId, messages: [npsReply(invalidCharactersReply)] };
	}
	const store = databaseProvider.getPersonaStore();
	if ((await store.listPersonas(customerId)).length >= maximumPersonasPerCustomer) {
		return { connectionId, messages: [npsReply(personaLimitReply, u32(maximumPersonasPerCustomer))] };
	}
	const persona = await store.createPersona(customerId, name, shardId);
	if (typeof persona === "undefined") {
		return { connectionId, messages: [npsReply(nameTakenReply)] };
	}
	log.info(`Created persona ${persona.personaId} on shard ${shardId} in ${gameName} for customer ${customerId}`);
	return { connectionId, messages: [npsReply(personaCreatedReply, gamePersonaRecord(persona))] };
}
