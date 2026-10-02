import type { PersonaSummary } from "rusty-motors-shared";
import { lengthPrefixedString, u32 } from "./npsWire.js";

function u16(value: number): Buffer {
	const bytes = Buffer.alloc(2);
	bytes.writeUInt16BE(value, 0);
	return bytes;
}

/**
 * The game persona record the client reads from a create reply (0x601) and a persona info reply
 * (MCity_d.exe 0xAB5510), field by field: customer id, name, server id, creation stamp, last login
 * stamp, number of games, GameUserId, u16 online, game purchase stamp, serial number, time online,
 * time in game, game blob, personal blob, picture blob, u8 do-not-disturb, game start stamp, current
 * key, u16 profile level, shard id. Fields the server keeps nothing for are sent empty.
 */
export function gamePersonaRecord(persona: PersonaSummary): Buffer {
	return Buffer.concat([
		u32(persona.customerId),
		lengthPrefixedString(persona.name),
		u32(0),
		u32(persona.createStamp),
		u32(persona.createStamp),
		u32(0),
		u32(persona.personaId),
		u16(0),
		u32(0),
		lengthPrefixedString(""),
		u32(0),
		u32(0),
		lengthPrefixedString(""),
		lengthPrefixedString(""),
		lengthPrefixedString(""),
		Buffer.from([0]),
		u32(0),
		lengthPrefixedString(""),
		u16(0),
		u32(persona.shardId),
	]);
}
