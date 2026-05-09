# Veles

Veles is a local-first Vite + React app for generating songs with Tempolor and saving them to a local SQLite library.

## Local backend

- Database: `./data/veles.db`
- Driver: `better-sqlite3`
- API surface: local `/api` routes served by Vite middleware during development and preview
- Tempolor proxy route: `app/api/tempolor-proxy/route.ts` with shared server logic in `server/tempolor-proxy.ts`

## Development

```bash
npm install
npm run dev
```

The SQLite schema is created automatically on startup by `src/lib/db.ts`.

## Build

```bash
npm run build
```

## Notes

- Songs and settings are stored locally in SQLite instead of Supabase.
- The frontend still uses the same async helper functions from `src/lib/api.ts`.
- The Tempolor API key is stored in the local `settings` table and never exposed directly to the browser.
