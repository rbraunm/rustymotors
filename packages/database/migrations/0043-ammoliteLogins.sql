-- +goose Up
-- +goose StatementBegin
-- Logins the ammolite portal manages through the account service (packages/gateway/src/accountService.ts).

-- A locked login cannot log in. ammolite locks a login it removes and unlocks it when claimed back.
ALTER TABLE login ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

-- Names are unique ignoring case, so a new login cannot shadow another by capitalization.
CREATE UNIQUE INDEX IF NOT EXISTS login_lower_name_idx ON login (lower(login_name));

-- Customer ids for logins made outside the game, clear of the demo login's 654321.
CREATE SEQUENCE IF NOT EXISTS customer_id_seq START WITH 1000000;
-- +goose StatementEnd
