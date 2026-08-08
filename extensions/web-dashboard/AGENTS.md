# Plicko — web-dashboard extension

The web dashboard for Plicko: it lets users browse and manage the files they've
uploaded through the service (all files live in the shared S3 backend). It is
**one of several extensions** in this monorepo that connect to the common Rust
backend, and it owns nothing about that backend. For how this sub-project fits
into the repo and for the backend API reference, read the root `AGENTS.md`.

## Stack

| Concern         | Choice                                            |
| :-------------- | :------------------------------------------------ |
| Package manager | [Bun](https://bun.com/docs)                       |
| Framework       | [Astro](https://docs.astro.build)                 |
| UI framework    | [SolidJS](https://docs.solidjs.com/)              |
| Components      | [Corvu](https://corvu.dev/docs/)                  |
| Styling         | Tailwind CSS v4 (via `@tailwindcss/vite`)         |
| Supporting libs | `@astrojs/solid-js`, `@kobalte/core`, `class-variance-authority`, `tailwind-merge` |

The toolchain is wired together in `astro.config.mjs` (the SolidJS integration
plus the Tailwind Vite plugin). **`corvu` is the primary headless component
library** — keep component APIs aligned with it rather than hand-rolling
headless UI. There is a `~/*` path alias pointing at `src/*` (see
`tsconfig.json`); `src/lib/utils.ts` exports the `cn()` helper for merging
Tailwind classes. TypeScript runs in **strict mode**.

## Layout

```
extensions/web-dashboard/
├── astro.config.mjs      # Astro + SolidJS + Tailwind integration
├── package.json          # scripts + dependencies
├── tsconfig.json         # strict; `~/*` -> `src/*`
├── public/               # static assets served as-is (favicons)
└── src/
    ├── assets/           # imported / processed images
    ├── components/       # SolidJS/`.astro` components
    ├── layouts/          # page shells (e.g. Layout.astro)
    ├── lib/              # shared non-component code (e.g. utils.ts)
    ├── pages/            # route definitions (e.g. index.astro)
    └── styles/           # global.css
```

## Commands

Run everything from this directory (`extensions/web-dashboard/`):

| Command            | Action                                          |
| :----------------- | :---------------------------------------------- |
| `bun install`      | Install dependencies                            |
| `bun run dev`      | Start the local dev server                      |
| `bun run build`    | Build the production site into `./dist/`        |
| `bun run preview`  | Preview a production build locally              |
| `bun run astro …`  | Run Astro CLI commands (e.g. `astro add`)       |

> From an agent context, launch the dev server in **background mode**:
>
> ```
> astro dev --background
> ```
>
> Manage it with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Talking to the backend

The dashboard consumes the Plicko backend's HTTP API. The exact request and
response shapes live in the backend source under `/backend/src/routes` —
**read those files rather than guessing**, and never edit them.

Notable points for a client:

- Every API call (except `GET /`) must send the configured access key in the
  **`x-api-key`** header.
- `GET /v1/uploads/list` returns paginated upload metadata
  (`id`, `filename`, `content_type`, `size_bytes`, `s3_object_key`, `expires_at`).
- `GET /v1/stats` returns `{ "total_size_bytes": number }`.
- Files are uploaded directly to S3 via a presigned URL — the dashboard
  typically only *lists* and *links* existing uploads.

## Conventions

- Keep TypeScript enforcement on **strict** mode.
- Use the `cn()` helper from `src/lib/utils.ts` for conditional class names.
- Prefer `corvu` components over bespoke headless UI.
- Put route pages in `src/pages/`, reusable UI in `src/components/`, and
  non-component logic in `src/lib/`.
