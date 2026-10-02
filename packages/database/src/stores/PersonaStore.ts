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

import * as pg from "@databases/pg";
import { type ConnectionPool, type ConnectionPoolConfig, sql } from "@databases/pg";
import type { IPersonaStore, PersonaSummary } from "rusty-motors-shared";

type createConnectionPool = (
    connectionConfig?: string | ConnectionPoolConfig | undefined,
) => ConnectionPool;

const deletedPlayerType = 4;

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

    async isPersonaNameTaken(name: string): Promise<boolean> {
        const rows = await this.pool.query(sql`
            SELECT 1 FROM player
            WHERE lower(persona) = lower(${name}) AND player_type_id <> ${deletedPlayerType}
            LIMIT 1`);
        return rows.length > 0;
    }
}
