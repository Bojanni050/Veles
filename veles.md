# Veles — Kilo Code Rules

## 🗂️ Project Context

Veles is a local-first AI music generation desktop app.

- **Stack**: Next.js 16 + React 19 + TypeScript + Chakra UI v3 + better-sqlite3 + Electron 42
- **Package manager**: npm (not pnpm, not yarn)
- **DB**: SQLite at `./data/veles.db` — single-user, no migrations, schema auto-created on startup
- **API providers**: Tempolor (own model) and PoYo AI (Suno-based)
- **Proxy pattern**: All external API calls go through server-side Next.js route handlers — never call external APIs directly from the browser

---

## 📋 General Rules

- Always validate before marking a task complete
- Always append to `walkthrough.md` after every meaningful change (see format below)
- Never install a new dependency without first checking if an existing one covers the need
- Never skip steps when implementing a new feature or pattern
- Prefer editing existing files over creating new ones when the change is small

---

## 🔷 TypeScript Rules

- Always use explicit types — no `any`
- Use `type` not `interface` for object shapes
- Use `void` operator for fire-and-forget async: `void handleAction()`
- Never use `!` non-null assertions — validate explicitly instead

---

## ⚛️ React & UI Rules

- Never use `<form>` elements — use `onClick`/`onChange` handlers
- Never use inline `style={{}}` — use CSS classes or Chakra design tokens
- Never use arbitrary hex colors or hardcoded values outside the design token system
- Use only design tokens defined in the Chakra theme config
- Load data in `useEffect` — store in local component state

---

## ⚠️ Error Handling

- Always check for errors before using returned data
- Never silently swallow errors — surface them to the user via `toaster`
- Use the existing `toaster` pattern from `@/components/ui/toaster` consistently

---

## 🏗️ Architecture Rules

- Provider abstraction: all music generation goes through `src/lib/music-provider.ts` interface
- Never call Tempolor or PoYo APIs directly from frontend — always via proxy routes
- Server-side proxy files live in `server/` — route handlers in `app/api/`
- Settings keys: `tempolor_api_key`, `poyo_api_key`, `active_provider`, `default_model`, `default_language`
- All AI instruction constants live in a single dedicated file — never scattered

---

## 🤖 AI Prompts Rule

- AI routes always return plain text — no markdown unless explicitly required

---

## 📝 Walkthrough Format

After every significant change, append to `walkthrough.md` (oldest → newest):

```markdown
## YYYY-MM-DD (Short title)

- Findings: [What was the problem or trigger?]
- Conclusions: [Why this approach?]
- Actions: [Which files changed and what exactly?]; validated.
```

---

## 🚫 Never Do This

- Use `any` as a type
- Use `interface` instead of `type`
- Use `<form>` elements
- Use inline styles
- Modify existing migration files
- Install dependencies without checking existing ones first
- Leave errors silently unhandled
- Scatter configuration or constants across multiple files
- Call external APIs directly from browser/client code

---

## 💡 Code Style Preferences

- Explain reasoning behind non-obvious suggestions
- Prioritize clean, maintainable code over premature optimization
- Warn about potential bugs or security issues proactively
- Keep server/client boundary explicit and clean
