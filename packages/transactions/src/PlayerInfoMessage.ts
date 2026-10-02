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
import { SqlTimeStamp } from "rusty-motors-protocol";

/**
 * A message listing the player's owned vehicles
 * This is the body of a MessageNode
 */
export class PlayerInfoMessage extends BytableBuffer {
	_msgNo: number; // 2 bytes
	_playerId: number; // 4 bytes
	_playerName: string; // 13 bytes
	_driversLicense: string; // 12 bytes
	_driverClass: number; // 1 byte
	_bankBalance: number; // 4 bytes
	_numberOfVehicles: number; // 2 bytes
	_isLoggedOn: boolean; // 1 byte
	_carsList: string[] = []; // 6 entries of 3 byte strings
	_licensesPlateCode: number; // 2 bytes
	_licensesPlateText: string; // 8 bytes
	_carInfoSetttings: number; // 4 bytes
	_vehicleId: number; // 4 bytes
	_numberOfRacesEntered: number; // 4 bytes
	_numberOfRacesWon: number; // 4 bytes
	_numberOfRacesCompleted: number; // 4 bytes
	_totalWinings: number; // 4 bytes
	_insuranceRisk: number; // 2 bytes
	_insurancePoints: number; // 4 bytes
	_challengeRacesEntered: number; // 4 bytes
	_challengeRacesWon: number; // 4 bytes
	_challengeRacesCompleted: number; // 4 bytes
	_numberofCarsWon: number; // 2 bytes
	_numberOfCarsLost: number; // 2 bytes
	_points: number; // 4 bytes
	_currentLevel: number; // 4 bytes
	_currentRank: number; // 4 bytes
	_numberOfPointsToNextLevel: number; // 2 bytes
	_numberOfPointsToNextRank: number; // 2 bytes
	_maxInventorySlots: number; // 4 bytes
	_numberOfInventorySlotsUsed: number; // 4 bytes
	_numberOfInventoryIemsOnAuction: number; // 4 bytes
	_highestBidInAuction: number; // 4 bytes
	_currentClub: number; // 4 bytes
	_dateLeftClub: SqlTimeStamp; // 16 bytes
	_canBeInvitedToClub: boolean; // 1 byte
	_playerDescription: string; // 257 bytes

	constructor() {
		super();
		this._msgNo = 122; // 2 bytes
		this._playerId = 0; // 4 bytes
		this._playerName = ""; // 13 bytes
		this._driversLicense = ""; // 12 bytes
		this._driverClass = 0; // 1 byte
		this._bankBalance = 0; // 4 bytes
		this._numberOfVehicles = 0; // 2 bytes
		this._isLoggedOn = false; // 1 byte
		this._carsList = ["", "", "", "", "", ""]; // 6 entries of 3 byte strings
		this._licensesPlateCode = 0; // 2 bytes
		this._licensesPlateText = ""; // 8 bytes
		this._carInfoSetttings = 0; // 4 bytes
		this._vehicleId = 0; // 4 bytes
		this._numberOfRacesEntered = 0; // 4 bytes
		this._numberOfRacesWon = 0; // 4 bytes
		this._numberOfRacesCompleted = 0; // 4 bytes
		this._totalWinings = 0; // 4 bytes
		this._insuranceRisk = 0; // 2 bytes
		this._insurancePoints = 0; // 4 bytes
		this._challengeRacesEntered = 0; // 4 bytes
		this._challengeRacesWon = 0; // 4 bytes
		this._challengeRacesCompleted = 0; // 4 bytes
		this._numberofCarsWon = 0; // 2 bytes
		this._numberOfCarsLost = 0; // 2 bytes
		this._points = 0; // 4 bytes
		this._currentLevel = 0; // 4 bytes
		this._currentRank = 0; // 4 bytes
		this._numberOfPointsToNextLevel = 0; // 2 bytes
		this._numberOfPointsToNextRank = 0; // 2 bytes
		this._maxInventorySlots = 0; // 4 bytes
		this._numberOfInventorySlotsUsed = 0; // 4 bytes
		this._numberOfInventoryIemsOnAuction = 0; // 4 bytes
		this._highestBidInAuction = 0; // 4 bytes
		this._currentClub = 0; // 4 bytes
		this._dateLeftClub = new SqlTimeStamp(); // 16 bytes
		this._canBeInvitedToClub = false; // 1 byte
		this._playerDescription = ""; // 257 bytes
	}

	// MCity_d.exe keeps the reply as its persona record: the profile reads the name at 6 and the
	// description at 0xA6 (0x8B23E0), and appends the MC_PLAYER_PHYSICAL_INFO it fetches next at 0x1A7
	// (0x97B7D0), so the reply is 423 bytes. Text is in the Windows ANSI code page.
	override size() {
		return 423;
	}

	override serialize() {
		const buffer = Buffer.alloc(this.size());
		let offset = 0;
		const text = (value: string, fieldLength: number) => {
			if (value.length >= fieldLength) {
				throw new Error(`${JSON.stringify(value)} does not fit a ${fieldLength}-byte field with its NUL`);
			}
			buffer.write(value, offset, fieldLength, "latin1");
			offset += fieldLength;
		};
		const u8 = (value: number) => {
			offset = buffer.writeUInt8(value, offset);
		};
		const u16 = (value: number) => {
			offset = buffer.writeUInt16LE(value, offset);
		};
		const u32 = (value: number) => {
			offset = buffer.writeUInt32LE(value, offset);
		};
		u16(this._msgNo);
		u32(this._playerId);
		text(this._playerName, 13);
		text(this._driversLicense, 12);
		u8(this._driverClass);
		u32(this._bankBalance);
		u16(this._numberOfVehicles);
		u8(this._isLoggedOn ? 1 : 0);
		for (const carNumber of this._carsList) {
			text(carNumber, 3);
		}
		u16(this._licensesPlateCode);
		text(this._licensesPlateText, 8);
		u32(this._carInfoSetttings);
		u32(this._vehicleId);
		u32(this._numberOfRacesEntered);
		u32(this._numberOfRacesWon);
		u32(this._numberOfRacesCompleted);
		u32(this._totalWinings);
		u16(this._insuranceRisk);
		u32(this._insurancePoints);
		u32(this._challengeRacesEntered);
		u32(this._challengeRacesWon);
		u32(this._challengeRacesCompleted);
		u16(this._numberofCarsWon);
		u16(this._numberOfCarsLost);
		u32(this._points);
		u32(this._currentLevel);
		u32(this._currentRank);
		u16(this._numberOfPointsToNextLevel);
		u16(this._numberOfPointsToNextRank);
		u32(this._maxInventorySlots);
		u32(this._numberOfInventorySlotsUsed);
		u32(this._numberOfInventoryIemsOnAuction);
		u32(this._highestBidInAuction);
		u32(this._currentClub);
		offset += this._dateLeftClub.serialize().copy(buffer, offset);
		u8(this._canBeInvitedToClub ? 1 : 0);
		text(this._playerDescription, 257);
		if (offset !== buffer.length) {
			throw new Error(`PlayerInfoMessage filled ${offset} of its ${buffer.length} bytes`);
		}
		return buffer;
	}

	override toString() {
		return `PlayerInfoMessage: msgNo=${this._msgNo} playerId=${this._playerId} playerName=${this._playerName} driversLicense=${this._driversLicense} driverClass=${this._driverClass} bankBalance=${this._bankBalance} numberOfVehicles=${this._numberOfVehicles} isLoggedOn=${this._isLoggedOn} carsList=${this._carsList} licensesPlateCode=${this._licensesPlateCode} licensesPlateText=${this._licensesPlateText} carInfoSetttings=${this._carInfoSetttings} vehicleId=${this._vehicleId} numberOfRacesEntered=${this._numberOfRacesEntered} numberOfRacesWon=${this._numberOfRacesWon} numberOfRacesCompleted=${this._numberOfRacesCompleted} totalWinings=${this._totalWinings} insuranceRisk=${this._insuranceRisk} insurancePoints=${this._insurancePoints} challengeRacesEntered=${this._challengeRacesEntered} challengeRacesWon=${this._challengeRacesWon} challengeRacesCompleted=${this._challengeRacesCompleted} numberofCarsWon=${this._numberofCarsWon} numberOfCarsLost=${this._numberOfCarsLost} points=${this._points} currentLevel=${this._currentLevel} currentRank=${this._currentRank} numberOfPointsToNextLevel=${this._numberOfPointsToNextLevel} numberOfPointsToNextRank=${this._numberOfPointsToNextRank} maxInventorySlots=${this._maxInventorySlots} numberOfInventorySlotsUsed=${this._numberOfInventorySlotsUsed} numberOfInventoryIemsOnAuction=${this._numberOfInventoryIemsOnAuction} highestBidInAuction=${this._highestBidInAuction} currentClub=${this._currentClub} dateLeftClub=${this._dateLeftClub} canBeInvitedToClub=${this._canBeInvitedToClub} playerDescription=${this._playerDescription}`;
	}
}
