## 2026-05-09 (SQLite local backend)

- Findings: Supabase access was centralized in `src/lib/api.ts`, but this Vite app had no server runtime for local SQLite access.
- Conclusions: Preserve the existing frontend API surface, move storage and secret proxying behind a local Node-backed API, and add a Next-compatible route wrapper for the Tempolor proxy.
- Actions: Replaced Supabase client usage with local `/api` calls, added a singleton SQLite bootstrap at `src/lib/db.ts`, added local API handlers and a Tempolor proxy route wrapper, updated config for local database serving, and validated.
