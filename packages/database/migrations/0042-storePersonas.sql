-- +goose Up
-- +goose StatementBegin
-- A persona is a profile row (the NPS record the client lists and creates: name, shard,
-- creation stamp) and a player row (the game's data: money, appearance, description), sharing
-- one id, the client's GameUserId. A deleted persona's player row becomes Deleted Player (4).

-- The profile fields the client's create request leaves empty.
ALTER TABLE profile ALTER COLUMN game_serial_number SET DEFAULT '';
ALTER TABLE profile ALTER COLUMN time_online SET DEFAULT 0;
ALTER TABLE profile ALTER COLUMN time_in_game SET DEFAULT 0;
ALTER TABLE profile ALTER COLUMN game_blob SET DEFAULT '';
ALTER TABLE profile ALTER COLUMN personal_blob SET DEFAULT '';
ALTER TABLE profile ALTER COLUMN picture_blob SET DEFAULT '';
ALTER TABLE profile ALTER COLUMN current_key SET DEFAULT '';
CREATE INDEX IF NOT EXISTS profile_customer_idx ON profile (customer_id);

-- The Edit Persona dialog's description (MC_SET_PERSONA_DESCRIPTION, 256 bytes with its NUL).
ALTER TABLE player ADD COLUMN IF NOT EXISTS description VARCHAR(255) NOT NULL DEFAULT '';

-- Live names are unique ignoring case; seeded system players count as taken.
CREATE UNIQUE INDEX IF NOT EXISTS player_live_persona_name_idx ON player (lower(persona)) WHERE player_type_id <> 4;

-- New personas take ids above every seeded player (0-999).
CREATE SEQUENCE IF NOT EXISTS persona_id_seq START WITH 1000;

-- Dr Brown: the demo login's persona from before personas were stored, which already owns cars.
INSERT INTO profile (customer_id, profile_name, profile_id, shard_id)
  VALUES (654321, 'Dr Brown', 21, 44)
  ON CONFLICT (profile_id) DO NOTHING;
INSERT INTO player (player_id, customer_id, player_type_id, bank_balance, num_cars_owned, driver_style, lp_code,
    car_num1, car_num2, car_num3, car_num4, car_num5, car_num6, persona)
  SELECT 21, 654321, 3, 50,
    (SELECT count(*) FROM vehicle JOIN part ON part.part_id = vehicle.vehicle_id WHERE part.owner_id = 21),
    0, 0, '', '', '', '', '', '', 'Dr Brown'
  WHERE NOT EXISTS (SELECT 1 FROM player WHERE player_id = 21);
-- +goose StatementEnd
