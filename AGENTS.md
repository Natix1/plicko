# Plicko - Guide

## What Plicko is

Plicko is a self-hosted, S3-backed file storage service built to solve one
simple problem: **10 megabytes were never enough.** Chat apps (notably Discord)
cap upload sizes unless you pay, so Plicko lets you push big files from an app
straight up into your own cloud bucket instead.

Workflow at a glance — every upload goes through the same pipeline no matter
which extension the user happens to be using:

1. The client requests a **presigned S3 PUT URL** from the backend
   (`POST /v1/uploads/presign`).
2. The client uploads the file bytes directly to S3 using that URL — the
   backend never proxies the large payload.
3. The client calls **confirm** (`POST /v1/uploads/confirm`), which moves the
   object from its staging key to a permanent key and records it in Postgres.
4. The object becomes publicly readable through the configured S3 public URI
   until its TTL expires.

Plicko started as a personal project (see `README.md`) and is licensed GPLv3.

## Repository layout

Plicko is a **monorepo** that mixes two very different codebases:

```
.
├── backend/        # The core service (Rust/Axum). DO NOT MODIFY unless explicitly prompted — see below.
├── extensions/     # One self-contained sub-project per client.
│   ├── vencord/          # Discord client mod (Vencord) integration.
│   └── ...               # More extensions are expected over time.
├── .github/        # CI (currently only deploys the backend image).
└── README.md
```

### `backend/` — the core service (read-only for AI agents)

The backend is written in **Rust** using **Axum**, backed by **Postgres** and an
**S3-compatible** object store (MinIO, Cloudflare R2, AWS S3, …). It owns all of
the business logic, authentication, and storage.

**It is holy. Do not edit it unless explicitly prompted.** Your job lives inside one of the
`extensions/*` directories. Treat `backend/` purely as a _read-only API
reference_: whenever you need to know how to talk to the backend, read these
files:

- `backend/src/main.rs` — the route table and what gets served.
- `backend/src/routes/**` — the exact request/response shape of every route.

The current authenticated API (everything except `GET /` requires an
`x-api-key` header matching the configured access key):

| Method | Path                  | Purpose                                         |
| :----- | :-------------------- | :---------------------------------------------- |
| POST   | `/v1/uploads/presign` | Get a presigned S3 PUT URL + headers for a file |
| POST   | `/v1/uploads/confirm` | Finalize a staged upload into a permanent key   |
| GET    | `/v1/uploads/list`    | Page through non-expired upload records         |
| GET    | `/v1/stats`           | Total size of live uploads in bytes             |
| GET    | `/`                   | Health check (no auth required)                 |

## `extensions/` — the many clients

Plicko is designed to be consumed by **many extensions**, each its own
self-contained sub-project that connects to the shared backend. There is no
single "the app" — the Discord mod and future clients are peers, not variations
of one another.

**Each extension directory has its own `AGENTS.md`.** Always read the
`AGENTS.md` _inside the extension you are working on_ before touching anything,
and follow its conventions. Do not assume tooling or commands carry over from
one extension to another — they genuinely differ:

- `vencord/` uses **pnpm**, TypeScript/React, and a cloned `Vencord` tree.

If you ever create a new extension, give it its own `AGENTS.md` in the same
spirit so future agents and humans don't have to reverse-engineer it.

## Golden rules for agents

1. **Never modify `backend/` unless explicitly prompted.** Read it as a spec for the API when you need to.
2. **Work only inside the `extensions/<name>/` directory** you were asked about.
3. **Read that extension's `AGENTS.md`** before making any change.
4. Keep extension sub-projects self-contained; duplicate config in an
   extension's own docs rather than touching other extensions or the backend.
