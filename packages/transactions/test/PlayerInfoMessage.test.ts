import { describe, expect, it } from "vitest";
import { PlayerInfoMessage } from "../src/PlayerInfoMessage.js";

describe("PlayerInfoMessage", () => {
	it("is the 423 bytes the client keeps, with the name at 6 and the description at 166", () => {
		const message = new PlayerInfoMessage();
		message._msgNo = 108;
		message._playerId = 1003;
		message._playerName = "George";
		message._bankBalance = 2606;
		message._playerDescription = "Hill Valley High, class of 85";

		const buffer = message.serialize();

		expect(buffer.length).toBe(423);
		expect([buffer.readUInt16LE(0), buffer.readUInt32LE(2), buffer.readUInt32LE(32)]).toEqual([108, 1003, 2606]);
		expect(buffer.subarray(6, 13).toString("latin1")).toBe("George\u0000");
		expect(buffer.subarray(166, 196).toString("latin1")).toBe("Hill Valley High, class of 85\u0000");
	});

	it("refuses a description longer than its field holds", () => {
		const message = new PlayerInfoMessage();
		message._playerDescription = "x".repeat(257);
		expect(() => message.serialize()).toThrow(/257-byte field/);
	});
});
