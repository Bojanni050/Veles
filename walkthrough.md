## 2026-05-09 (SQLite local backend)

- Findings: Supabase access was centralized in `src/lib/api.ts`, but this Vite app had no server runtime for local SQLite access.
- Conclusions: Preserve the existing frontend API surface, move storage and secret proxying behind a local Node-backed API, and add a Next-compatible route wrapper for the Tempolor proxy.
- Actions: Replaced Supabase client usage with local `/api` calls, added a singleton SQLite bootstrap at `src/lib/db.ts`, added local API handlers and a Tempolor proxy route wrapper, updated config for local database serving, and validated.

## 2026-05-09 (Next runtime and import path)

- Findings: The prior SQLite migration still depended on Vite middleware, which did not satisfy a full Next.js conversion or provide a reusable import path for Supabase data.
- Conclusions: Move routing and API handling into the Next App Router, keep the client data helpers stable, and add a standalone importer that can read Supabase REST data into SQLite.
- Actions: Replaced Vite with Next scripts and config, added App Router pages and route handlers, updated client components for Next routing, hardened the SQLite singleton, added a Supabase import script, and validated.

## 2026-05-09 (Lint cleanup)

- Findings: ESLint was still flagging empty interface declarations in Chakra helper components.
- Conclusions: Keep the component APIs the same and switch the empty interfaces to type aliases to satisfy the current lint rules.
- Actions: Updated the four flagged UI helpers to use type aliases instead of empty interfaces and re-ran lint successfully.

## 2026-05-09 (Page persistence)

- Findings: Generator drafts and library selection state were reset when moving between routes or refreshing the page.
- Conclusions: Persist only the page-local UI state that benefits from restoration, and leave SQLite-backed settings in the database.
- Actions: Added a reusable localStorage state hook, persisted the generator draft fields, persisted the selected library song, and validated with build and lint.

## 2026-05-09 (Package JSON recovery)

- Findings: package.json had two top-level objects merged together, causing npm EJSONPARSE failures.
- Conclusions: Merge all required Electron and Next fields into one valid JSON object while preserving the webpack-based Next scripts.
- Actions: Repaired package.json structure, kept Electron scripts/config in the same object, and validated script execution with npm.

## 2026-05-09 (Electron ESM startup fix)

- Findings: Electron main process crashed under `"type": "module"` because it still used CommonJS `require`, and startup logic also attempted to spawn Next internally in a Windows-unsafe way.
- Conclusions: Convert `electron/main.js` to native ESM and make Electron consume an explicit start URL from environment, while script-level orchestration handles Next startup.
- Actions: Rewrote Electron main imports to ESM with `fileURLToPath`/`__dirname` derivation, removed internal Next spawning, updated Electron dev/preview scripts to pass `ELECTRON_START_URL`, and validated by running Electron dev until Next compiled without the previous require error.

## 2026-05-09 (Port 5377 standardization)

- Findings: Default Electron development ports were conflicting with other local processes and causing repeated `EADDRINUSE` startup failures.
- Conclusions: Standardize both Electron and regular Next runtime scripts on a dedicated port and keep the main-process fallback URL aligned with script-level configuration.
- Actions: Verified port `5377` was available, updated Electron dev/preview scripts and standard Next dev/start scripts to use `5377`, aligned `ELECTRON_START_URL` and main fallback URL to `http://localhost:5377`, and validated startup reaches Next readiness on the new port.

## 2026-05-09 (Native Windows menu toggle)

- Findings: The desktop app always hid the native menu bar, and there was no user-facing control to enable it.
- Conclusions: Add a secure Electron preload bridge with IPC handlers, then expose a persisted toggle in Settings to control the native menu bar at runtime.
- Actions: Added native menu creation and IPC handlers in Electron main, added a preload API for menu state changes, added a new Settings toggle backed by `native_windows_menu_enabled`, and validated with lint plus Electron startup on port `5377`.

## 2026-05-09 (Tempolor null response guard)

- Findings: Song generation could crash with `Cannot read properties of null (reading 'item_ids')` when the proxy returned a success response containing empty or null `data`.
- Conclusions: Validate Tempolor payloads centrally and require non-empty `item_ids` before continuing generation flows.
- Actions: Hardened Tempolor client response parsing, surfaced upstream `error` fields, added explicit null guards and `item_ids` validation, and validated with lint.

## 2026-05-09 (One-shot retry for missing item IDs)

- Findings: Some generation requests returned transient responses without `item_ids` even though a retry can succeed shortly after.
- Conclusions: Keep strict validation but allow one automatic retry only for the specific missing-item-IDs condition.
- Actions: Added a focused one-shot retry wrapper for lyrics/song generation calls when `item_ids` are missing, preserved immediate failure for all other errors, and validated with lint.
