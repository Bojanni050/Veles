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

## 2026-05-09 (Configurable API request logging)

- Findings: Debugging Tempolor integration issues required manual instrumentation because request/response visibility was not available by default.
- Conclusions: Add server-side proxy logging controlled by a persisted user setting so logs can be enabled only when needed.
- Actions: Added an `api_request_logging_enabled` toggle in Settings, persisted the value in the existing settings store, wired the Tempolor proxy to log method/path/body keys and response status/duration when enabled, and validated with lint.

## 2026-05-09 (API key visibility toggle)

- Findings: The API key field was always masked, which made manual entry and verification error-prone.
- Conclusions: Reuse the existing shared password input component with built-in visibility toggle so behavior stays consistent across the app.
- Actions: Replaced the Settings API key input with `PasswordInput` (eye icon show/hide control) and validated with lint.

## 2026-05-09 (Generation error message accuracy)

- Findings: Generator failure UI always showed an API-key-specific message even when the real cause was timeout or a different upstream error.
- Conclusions: Capture and display the actual generation error text so users can act on the correct failure reason.
- Actions: Added explicit generation error state in `GeneratorPage`, set timeout-specific and caught-error messages during generation flow, replaced the hardcoded failed-state text with dynamic error output, and validated with lint.

## 2026-05-09 (Native menu toggle availability fix)

- Findings: The native Windows menu toggle could remain disabled in Electron mode because preload bridge initialization was not reliable in the ESM `.js` preload setup.
- Conclusions: Use a CommonJS preload entry and derive support state through IPC (`getState`) to make desktop detection deterministic.
- Actions: Switched BrowserWindow preload to `electron/preload.cjs`, added the CJS preload bridge implementation, updated Settings support detection to read `supported` from bridge state, and validated with lint plus Electron startup readiness.

## 2026-05-09 (Native menu detection fallback)

- Findings: A transient IPC failure during settings load could still keep the native menu toggle disabled.
- Conclusions: Add a fallback that uses bridge platform detection when IPC state lookup fails.
- Actions: Added try/catch fallback in Settings native-menu support detection (`getState` -> `isSupported`) and validated with lint.

## 2026-05-09 (Tempolor proxy debug logging)

- Findings: Generation errors were not visible in console, making it difficult to diagnose API failures.
- Conclusions: Add always-on debug output in the proxy layer to show request routing, setting state, and fetch errors.
- Actions: Added console output for every proxy request, logging enable/disable status, API key presence, and detailed fetch error messages, and validated with lint.

## 2026-05-09 (parseItemIds utility function)

- Findings: The `item_ids` field is stored as a JSON string in the database but has no safe parser; accessing song.item_ids directly requires manual JSON parsing.
- Conclusions: Add a defensive utility function that safely parses item_ids and returns an empty array if the raw value is null, empty, or invalid JSON.
- Actions: Exported `parseItemIds(raw: string | null): string[]` from [src/lib/api.ts](src/lib/api.ts); function safely handles all error cases. No current usages in codebase, but function is ready for resume-generation or status-query features, and validated with lint.

## 2026-05-09 (Polling progress feedback)

- Findings: Song generation polls up to 60 times with 3-second intervals (3 minutes total), but users see no progress indication and don't know how long to wait.
- Conclusions: Track poll attempt count in state and display both a progress bar and attempt counter (e.g., "Attempt 12 of 60") during generation to provide real-time feedback.
- Actions: Added `pollAttempt` state to [src/screens/GeneratorPage.tsx](src/screens/GeneratorPage.tsx); imported `Progress` component from Chakra UI; updated `pollForResult` to increment attempt on each iteration; reset attempt counter at start and end of `handleGenerateSong`; replaced skeleton loader with animated striped progress bar and attempt text; validated with lint.

## 2026-05-09 (Tempolor flat payload parsing)

- Findings: `tempolorFetch` only handled wrapped `{ data: ... }` responses, but Tempolor can also return flat `{ item_ids: [...] }` or `{ error: "..." }` payloads.
- Conclusions: Parse the raw body directly in the helper so the code can distinguish empty or unparseable responses from valid flat payloads and surface top-level errors cleanly.
- Actions: Updated `src/lib/api.ts` so `tempolorFetch` logs raw payloads in development, treats flat `item_ids` responses as data, throws top-level `error` messages, and only uses the empty-response error when the body is truly empty or invalid.

## 2026-05-09 (Tempolor callback URL)

- Findings: Tempolor song generation requires a `callback_url` field even though Veles does not consume callbacks directly.
- Conclusions: Include a no-op callback URL in the request body so generation requests satisfy the upstream contract without changing local behavior.
- Actions: Added `callback_url: "https://example.com/noop"` to the `generateSong` request body in `src/lib/api.ts` and kept the retry/status flow unchanged.

## 2026-05-09 (Chakra progress runtime fix)

- Findings: The generator page crashed at render time because Chakra UI 3 uses the compound `Progress.Root` API rather than a direct `Progress` component.
- Conclusions: Keep the same progress semantics but render the v3 compound structure so the page can mount normally.
- Actions: Replaced the direct `<Progress>` usage in `src/screens/GeneratorPage.tsx` with `Progress.Root`/`Progress.Track`/`Progress.Range` and preserved the existing value, striped, and animated behavior.

## 2026-05-09 (Generator select accessibility fix)

- Findings: After the progress fix, the generator screen still failed a Chakra accessible-name check on the select controls.
- Conclusions: Use the repo's existing Chakra `Field` wrapper so the select labels are associated through the component system instead of relying on ad hoc attributes.
- Actions: Wrapped the generator model, language, and voice selects in `Field` and kept the select options and behavior unchanged.

## 2026-05-09 (Generator lyrics handler syntax fix)

- Findings: The app failed to compile with `Expected '}', got '<eof>'` because `handleGenerateLyrics` in `src/screens/GeneratorPage.tsx` was left incomplete.
- Conclusions: Restore a complete async lyrics generation handler with explicit loading state transitions and error/success toasts so the component closes correctly and behavior remains consistent.
- Actions: Implemented and closed `handleGenerateLyrics` in `src/screens/GeneratorPage.tsx` using `generateLyrics`, `setGeneratingLyrics`, `setLyrics`, and toast notifications; validated by re-checking file diagnostics for parser errors.

## 2026-05-09 (Global persistent bottom player)

- Findings: Audio playback controls were mounted only inside the Library screen, so the player disappeared on Generator and Settings routes.
- Conclusions: Move player state to a shared app-level context and render a single bottom player in the common layout so controls remain visible across the entire app.
- Actions: Added shared player context at `src/lib/player-context.tsx`, wrapped app providers with `PlayerProvider`, mounted `AudioPlayer` in `src/components/Layout.tsx` with global bottom padding for content, refactored `src/screens/LibraryPage.tsx` to drive the shared queue/current song state, and validated with diagnostics.

## 2026-05-09 (Force direct file downloads)

- Findings: Clicking MP3/WAV download controls could open the browser audio player tab instead of saving the file directly.
- Conclusions: Use blob-based downloads with explicit filenames to force save behavior, with a link fallback for hosts that reject fetch/CORS.
- Actions: Added `src/lib/download.ts` with a shared `downloadFile` helper, switched Library MP3/WAV actions in `src/screens/LibraryPage.tsx` to `void downloadFile(...)`, updated the Generator download button in `src/screens/GeneratorPage.tsx` to use the same helper, and validated diagnostics on changed files.

## 2026-05-09 (Tempolor lyrics/status contract alignment)

- Findings: Tempolor integration mismatched docs in three places: lyrics generation sent `model` instead of `song_model`, lyrics generation treated `item_ids` as final lyric text, and body-level `status` codes were not enforced.
- Conclusions: Align requests and lifecycle with documented endpoints by using `song_model`, polling `/open-apis/v1/lyrics/query` for final `lyric` content, and treating non-`200000` response status as API failures.
- Actions: Updated `src/lib/api.ts` to parse Tempolor `status`, throw on non-success business codes, send `song_model` in lyrics generation, and add lyrics polling that waits for `succeeded` with text from `lyric`/`lyrics`; validated changed files diagnostics.

## 2026-05-09 (Generator inline player redesign)

- Findings: The generated-song result card used the browser-native `<audio controls>`, which looked and behaved differently from the persistent bottom player.
- Conclusions: Replace the native control with a Chakra-based inline player that mirrors the bottom player's visual language and core controls.
- Actions: Updated `src/screens/GeneratorPage.tsx` to add a custom inline player with play/pause, time display, seek slider, and volume/mute controls using `audio_hi_url` fallback to `audio_url`; kept existing download/save actions and validated diagnostics.

## 2026-05-09 (TemPolor v4.5 model option)

- Findings: Model selectors in Generator and Settings only exposed `TemPolor v3` and `TemPolor v3.5`.
- Conclusions: Add `TemPolor v4.5` to both model option lists without changing defaults or storage behavior.
- Actions: Updated model arrays in `src/screens/GeneratorPage.tsx` and `src/screens/SettingsPage.tsx` to include `TemPolor v4.5`; validated changed files diagnostics.

## 2026-05-09 (Suno proxy API route)

- Findings: Suno API calls required a dedicated proxy route that reads `suno_api_key` from settings, supports query params, and mirrors Tempolor proxy logging behavior.
- Conclusions: Implement a server-side Suno proxy handler plus a Next route wrapper, preserving raw upstream JSON responses and status codes.
- Actions: Added `server/suno-proxy.ts` with key lookup, optional request/response logging via `api_request_logging_enabled`, query string forwarding, `Authorization: Bearer <key>`, and upstream pass-through response; added `app/api/suno-proxy/route.ts` POST wrapper; validated changed files diagnostics.

## 2026-05-09 (Suno client functions in api.ts)

- Findings: Frontend code had no Suno client helpers to call the new `/api/suno-proxy` route for song generation, polling, key management, and credits.
- Conclusions: Add a typed `sunoFetch` helper mirroring Tempolor conventions and expose focused Suno functions for generation, status checks, settings, and balance.
- Actions: Updated `src/lib/api.ts` with `sunoFetch<T>` (supports POST and GET via `queryParams`, enforces `code === 200`, returns `data`), added `generateSunoSong`, `querySunoStatus`, `getSunoApiKey`, `saveSunoApiKey`, and `getSunoBalance`, and validated diagnostics.

## 2026-05-09 (Suno key section in Settings)

- Findings: Settings only managed the Tempolor API key, but Suno integration also needed direct key management and connection validation in the same screen.
- Conclusions: Add a Suno API key block under Tempolor with the same password-input pattern and dedicated save/test actions.
- Actions: Updated `src/screens/SettingsPage.tsx` to load `getSunoApiKey()` on mount, render a `PasswordInput` labeled "Suno API Key" with helper text for `sunoapi.org/api-key`, add `Save Suno Key` action using `saveSunoApiKey()`, and add `Test Suno Key` action using `getSunoBalance()` to show remaining credits in a toast; validated diagnostics.

## 2026-05-09 (Suno dual-save generation result)

- Findings: The generator lacked a full Suno completion branch that persisted both songs returned in `sunoData`, and UI actions did not reflect auto-saved Suno results.
- Conclusions: Add a Suno-specific polling/success path that stores both generated tracks in the library, sets the first audio for inline playback, and marks the result as already saved.
- Actions: Updated `src/lib/api.ts` to include `sunoData` in `querySunoStatus` results and updated `src/screens/GeneratorPage.tsx` to route Suno models through `generateSunoSong` + `querySunoStatus`, save two songs (`(1)` and `(2)`) with Suno fields, set first `audioUrl` as result playback URL, show toast "2 songs saved to library", call `setSaved(true)`, and hide the Save button once saved; validated diagnostics.

## 2026-05-09 (Settings button placement update)

- Findings: Tempolor save/test actions were positioned at the bottom of the settings form instead of next to the Tempolor key input.
- Conclusions: Move the Tempolor action row directly under the Tempolor API key field to keep key actions contextual and easier to find.
- Actions: Updated `src/screens/SettingsPage.tsx` by relocating the existing Tempolor Save/Test button row under the Tempolor API key helper text and removing the bottom duplicate row; validated diagnostics.

## 2026-05-09 (Suno test flow reliability fix)

- Findings: Suno key testing could fail even with a typed key because the proxy reads from persisted settings, and balance payload shapes can vary across responses.
- Conclusions: Persist the current Suno key before running the test call and broaden balance parsing so valid credit data is recognized from common nested/typed variants.
- Actions: Updated `src/screens/SettingsPage.tsx` so `handleTestSunoApi` validates and saves the trimmed key before calling `getSunoBalance`, trimmed key on Suno save, and updated `src/lib/api.ts` `getSunoBalance()` to parse additional nested fields and numeric strings; validated diagnostics.

## 2026-05-09 (Suno balance endpoint correction)

- Findings: Suno docs define credits endpoint as `GET /api/v1/generate/credit`, while the client test used `/api/v1/credits/balance`, causing connection-test failures.
- Conclusions: Align the client with the documented endpoint and keep a fallback path for compatibility.
- Actions: Updated `src/lib/api.ts` `getSunoBalance()` to call `/api/v1/generate/credit` first, fallback to `/api/v1/credits/balance` on failure, and preserve existing response-shape parsing; validated diagnostics.

## 2026-05-09 (Per-provider credits in Generator)

- Findings: Generator header showed a single credits value and formatted Tempolor balances as decimal values, which did not match expected credit units (e.g., `9.70` vs `970`).
- Conclusions: Show credits per provider (Tempolor and Suno) and normalize Tempolor display to whole credit units.
- Actions: Updated `src/screens/GeneratorPage.tsx` to load and display separate Tempolor/Suno credit badges, refresh both balances on load and after generation, and format Tempolor credits as whole units for display; validated diagnostics.

## 2026-05-09 (Generator provider/model selection)

- Findings: Generator only exposed a flat model list and did not let users explicitly select provider before choosing provider-specific models.
- Conclusions: Add a provider selector and drive model options from the selected provider to keep generation options clear and consistent.
- Actions: Updated `src/screens/GeneratorPage.tsx` to add persistent provider selection (`Tempolor`/`Suno`), render provider-specific model options, keep model values valid when provider changes, gate voice selection to Tempolor only, and make Suno lyric auto-generation show a clear provider-specific message; validated diagnostics.

## 2026-05-09 (Suno model options update)

- Findings: Suno provider model dropdown had only a single placeholder model and did not match available Suno model variants.
- Conclusions: Align Suno model options with the current selectable variants shown in the Suno UI.
- Actions: Updated `src/screens/GeneratorPage.tsx` Suno model list to `V5.5`, `V5`, `V4.5+`, `V4.5`, `V4`, and `V4.5ALL`; validated diagnostics.
