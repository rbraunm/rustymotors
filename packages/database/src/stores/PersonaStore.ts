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

import { randomInt } from "node:crypto";
import * as pg from "@databases/pg";
import { type ConnectionPool, type ConnectionPoolConfig, sql } from "@databases/pg";
import type { IPersonaStore, PersonaSummary } from "rusty-motors-shared";

type createConnectionPool = (
    connectionConfig?: string | ConnectionPoolConfig | undefined,
) => ConnectionPool;

const playerType = 3;
const deletedPlayerType = 4;
// What a new persona starts with until starting values are settled: the bank balance the player info
// reply has always shown.
const startingBankBalance = 50;
const uniqueViolation = "23505";

type PersonaRow = {
    profile_id: number;
    customer_id: number;
    profile_name: string;
    shard_id: number;
    create_stamp: number;
};

function personaFromRow(row: PersonaRow): PersonaSummary {
    return {
        personaId: row.profile_id,
        customerId: row.customer_id,
        name: row.profile_name,
        shardId: row.shard_id,
        createStamp: row.create_stamp,
    };
}

/**
 * Personas in PostgreSQL: a profile row and a player row each, sharing the id
 * (see migration 0042-storePersonas).
 */
export class PersonaStore implements IPersonaStore {
    private pool: ConnectionPool;

    constructor(postgresUrl: string) {
        if (!postgresUrl) {
            throw new Error("PersonaStore needs the PostgreSQL URL (DATABASE_URL)");
        }
        this.pool = (pg.default as unknown as createConnectionPool)({
            connectionString: postgresUrl,
            bigIntMode: "number",
        });
    }

    async listPersonas(customerId: number): Promise<PersonaSummary[]> {
        const rows = (await this.pool.query(sql`
            SELECT profile.profile_id, profile.customer_id, profile.profile_name, profile.shard_id, profile.create_stamp
            FROM profile JOIN player ON player.player_id = profile.profile_id
            WHERE profile.customer_id = ${customerId} AND player.player_type_id <> ${deletedPlayerType}
            ORDER BY profile.create_stamp, profile.profile_id`)) as PersonaRow[];
        return rows.map(personaFromRow);
    }

    async findPersona(personaId: number): Promise<PersonaSummary | undefined> {
        const rows = (await this.pool.query(sql`
            SELECT profile.profile_id, profile.customer_id, profile.profile_name, profile.shard_id, profile.create_stamp
            FROM profile JOIN player ON player.player_id = profile.profile_id
            WHERE profile.profile_id = ${personaId} AND player.player_type_id <> ${deletedPlayerType}`)) as PersonaRow[];
        return rows.map(personaFromRow)[0];
    }

    async createPersona(customerId: number, name: string, shardId: number): Promise<PersonaSummary | undefined> {
        try {
            const rows = (await this.pool.tx(async (transaction) => {
                const [{ id }] = (await transaction.query(sql`SELECT nextval('persona_id_seq')::integer AS id`)) as [{ id: number }];
                await transaction.query(sql`
                    INSERT INTO player (player_id, customer_id, player_type_id, bank_balance, num_cars_owned, driver_style, lp_code,
                        car_num1, car_num2, car_num3, car_num4, car_num5, car_num6, persona)
                    VALUES (${id}, ${customerId}, ${playerType}, ${startingBankBalance}, 0, 0, 0, '', '', '', '', '', '', ${name})`);
                return transaction.query(sql`
                    INSERT INTO profile (customer_id, profile_name, profile_id, shard_id)
                    VALUES (${customerId}, ${name}, ${id}, ${shardId})
                    RETURNING profile_id, customer_id, profile_name, shard_id, create_stamp`);
            })) as PersonaRow[];
            return rows.map(personaFromRow)[0];
        } catch (error) {
            if ((error as { code?: string }).code === uniqueViolation) {
                return undefined;
            }
            throw error;
        }
    }

    async deletePersona(customerId: number, personaId: number): Promise<boolean> {
        const nameSuffix = `~${randomInt(100000, 1000000)}`;
        return this.pool.tx(async (transaction) => {
            const deleted = await transaction.query(sql`
                UPDATE player SET player_type_id = ${deletedPlayerType}, persona = persona || ${nameSuffix}
                WHERE player_id = ${personaId} AND customer_id = ${customerId} AND player_type_id <> ${deletedPlayerType}
                RETURNING persona`);
            if (deleted.length === 0) {
                return false;
            }
            await transaction.query(sql`
                UPDATE profile SET profile_name = ${(deleted[0] as { persona: string }).persona} WHERE profile_id = ${personaId}`);
            return true;
        });
    }

    async isPersonaNameTaken(name: string): Promise<boolean> {
        const rows = await this.pool.query(sql`
            SELECT 1 FROM player
            WHERE lower(persona) = lower(${name}) AND player_type_id <> ${deletedPlayerType}
            LIMIT 1`);
        return rows.length > 0;
    }
}
