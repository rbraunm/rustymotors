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

import { BytableBuffer } from "@rustymotors/binary";

// MCity_d.exe's persona messages (May 2002 client): every one has a 12-byte header
// (u16 id, u16 total length, u16 version, u16 reserved, u32 checksum, all big-endian; the
// client checks none but the id and length), then a body of big-endian fields. Strings are a
// u16 length and that many bytes, with no NUL. The client never skips unread bytes, so a
// reply must carry exactly the fields its reader takes.
export const npsHeaderLength = 12;
const npsVersion = 0x0101;

/** A reply: header with the real length, then the body. */
export function npsReply(id: number, body: Buffer = Buffer.alloc(0)): BytableBuffer {
	const header = Buffer.alloc(npsHeaderLength);
	header.writeUInt16BE(id, 0);
	header.writeUInt16BE(npsHeaderLength + body.length, 2);
	header.writeUInt16BE(npsVersion, 4);
	const reply = new BytableBuffer();
	reply.deserialize(Buffer.concat([header, body]));
	return reply;
}

export function lengthPrefixedString(text: string): Buffer {
	const bytes = Buffer.from(text, "latin1");
	const prefix = Buffer.alloc(2);
	prefix.writeUInt16BE(bytes.length, 0);
	return Buffer.concat([prefix, bytes]);
}

export function u32(value: number): Buffer {
	const bytes = Buffer.alloc(4);
	bytes.writeUInt32BE(value, 0);
	return bytes;
}

/** Reads a request's body field by field; reading past the end throws. */
export class NpsBodyReader {
	private offset = 0;

	constructor(private readonly body: Buffer) {}

	static of(request: Buffer): NpsBodyReader {
		if (request.length < npsHeaderLength) {
			throw new Error(`An NPS request of ${request.length} bytes is shorter than its header`);
		}
		return new NpsBodyReader(request.subarray(npsHeaderLength));
	}

	private take(length: number): Buffer {
		if (this.offset + length > this.body.length) {
			throw new Error(
				`The request body ends at ${this.body.length} bytes, before a field at ${this.offset} of ${length} bytes`,
			);
		}
		const bytes = this.body.subarray(this.offset, this.offset + length);
		this.offset += length;
		return bytes;
	}

	u32(): number {
		return this.take(4).readUInt32BE(0);
	}

	u16(): number {
		return this.take(2).readUInt16BE(0);
	}

	u8(): number {
		return this.take(1).readUInt8(0);
	}

	lengthPrefixedString(maximumLength: number): string {
		const length = this.take(2).readUInt16BE(0);
		if (length > maximumLength) {
			throw new Error(`A string of ${length} bytes is longer than the ${maximumLength} its field holds`);
		}
		return this.take(length).toString("latin1");
	}
}
