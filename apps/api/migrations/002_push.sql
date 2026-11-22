CREATE TABLE IF NOT EXISTS push_subscriptions (
 endpoint text PRIMARY KEY,
 room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
 person_id text NOT NULL,
 p256dh text NOT NULL,
 auth text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_room_person ON push_subscriptions(room_id, person_id);
