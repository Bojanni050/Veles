## 2026-05-09 (SQLite local backend)

- Findings: Supabase access was centralized in `src/lib/api.ts`, but this Vite app had no server runtime for local SQLite access.
- Conclusions: Preserve the existing frontend API surface, move storage and secret proxying behind a local Node-backed API, and add a Next-compatible route wrapper for the Tempolor proxy.
- Actions: Replaced Supabase client usage with local `/api` calls, added a singleton SQLite bootstrap at `src/lib/db.ts`, added local API handlers and a Tempolor proxy route wrapper, updated config for local database serving, and validated.

## 2026-05-09 (Next runtime and import path)

- Findings: The prior SQLite migration still depended on Vite middleware, which did not satisfy a full Next.js conversion or provide a reusable import path for Supabase data.
- Conclusions: Move routing and API handling into the Next App Router, keep the client data helpers stable, and add a standalone importer that can read Supabase REST data into SQLite.
- Actions: Replaced Vite with Next scripts and config, added App Router pages and route handlers, updated client components for Next routing, hardened the SQLite singleton, added a Supabase import script, and validated.
