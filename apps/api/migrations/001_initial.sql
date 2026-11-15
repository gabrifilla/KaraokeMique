CREATE TABLE IF NOT EXISTS rooms (
 id uuid PRIMARY KEY, code text UNIQUE NOT NULL,
 version integer NOT NULL CHECK(version > 0),
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 CHECK(data->>'id'=id::text), CHECK((data->>'version')::integer=version)
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash text PRIMARY KEY, room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
 actor jsonb NOT NULL, expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours'
);
CREATE INDEX IF NOT EXISTS session_room ON sessions(room_id);
CREATE TABLE IF NOT EXISTS tv_pairings (
 id uuid PRIMARY KEY, code text UNIQUE NOT NULL,
 device_hash text NOT NULL, expires_at timestamptz NOT NULL,
 room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
 consumed boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS command_receipts (
 session_hash text NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,
 command_id uuid NOT NULL, payload_hash text NOT NULL, response jsonb NOT NULL,
 PRIMARY KEY(session_hash,command_id)
);
CREATE TABLE IF NOT EXISTS outbox (
 id bigserial PRIMARY KEY, room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
 version integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz
);
CREATE INDEX IF NOT EXISTS outbox_pending ON outbox(id) WHERE published_at IS NULL;
CREATE TABLE IF NOT EXISTS pairings (
 code_hash text PRIMARY KEY, room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, consumed boolean NOT NULL DEFAULT false
);
