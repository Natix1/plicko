-- Add migration script here

CREATE TABLE IF NOT EXISTS uploads (
    id uuid PRIMARY KEY,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    s3_object_key TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
)