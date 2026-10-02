// mcos is a game server, written from scratch, for an old game
// Copyright (C) <2017>  <Drazi Crendraven>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import type { BytableBuffer } from "@rustymotors/binary";
import {
	databaseProvider,
	getServerLogger,
	type LegacyMessage,
	type PersonaSummary,
	type ServerLogger,
} from "rusty-motors-shared";
import { isRequestFromCustomer } from "./customerAccess.js";
import { NpsBodyReader, lengthPrefixedString, npsReply, u32 } from "./npsWire.js";

/** The most personas one account may have; the client reads it from the persona list. */
export const maximumPersonasPerCustomer = 5;
const personaMapsReply = 0x607;
const invalidUserReply = 0x602;

/**
 * The persona list body as the client reads it (NPSGetPersonaMaps, MCity_d.exe 0xAA7FF0): u16
 * count; each record a u16 length, then u32 customer id, u32 GameUserId, u32 shard id, u32
 * creation stamp, and the name; then a u8, the most personas the account may have.
 */
export function personaMapsBody(personas: PersonaSummary[]): Buffer {
	const count = Buffer.alloc(2);
	count.writeUInt16BE(personas.length, 0);
	const records = personas.map((persona) => {
		const fields = Buffer.concat([
			u32(persona.customerId),
			u32(persona.personaId),
			u32(persona.shardId),
			u32(persona.createStamp),
			lengthPrefixedString(persona.name),
		]);
		const length = Buffer.alloc(2);
		length.writeUInt16BE(fields.length, 0);
		return Buffer.concat([length, fields]);
	});
	return Buffer.concat([count, ...records, Buffer.from([maximumPersonasPerCustomer])]);
}

/** Lists a customer's personas (0x532, body u32 customer id), answering 0x607. */
export async function getPersonaMaps({
	connectionId,
	message,
	log = getServerLogger("PersonaServer/getPersonaMaps"),
}: {
	connectionId: string;
	message: LegacyMessage;
	log?: ServerLogger;
}): Promise<{
	connectionId: string;
	messages: BytableBuffer[];
}> {
	const customerId = NpsBodyReader.of(message._doSerialize()).u32();
	if (!isRequestFromCustomer(customerId)) {
		log.warn(`Persona list for customer ${customerId} refused: not from the address that logged in as it`);
		return { connectionId, messages: [npsReply(invalidUserReply)] };
	}
	const personas = await databaseProvider.getPersonaStore().listPersonas(customerId);
	log.debug(`${personas.length} personas found for ${customerId}`);
	return { connectionId, messages: [npsReply(personaMapsReply, personaMapsBody(personas))] };
}
