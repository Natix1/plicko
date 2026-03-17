CREATE TABLE uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    size_bytes BIGINT,
    uploaded_at TIMESTAMPTZ DEFAULT now()
);
