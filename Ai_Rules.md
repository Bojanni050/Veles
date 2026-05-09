# 🤖 AI Rules - Source of Truth
# Auto-generated from Ai_Rules.md — do not edit directly.
# To update: edit Ai_Rules.md and run "AI Rules: Sync All Rules".

This file is the **single source of truth** for all AI rules in this project.

Changes here are automatically synchronized to:
- Cursor (.cursorrules)
- GitHub Copilot (.github/copilot-instructions.md)
- Windsurf (.windsurfrules)
- Cline (.clinerules)
- Aider (.aider.conf.yml)
- Claude (CLAUDE.md)
- Generic agents (agents.md)

---

## 🧠 Memory Protocol

Two memory systems are active: **Hindsight** (semantic, long-term) and **Stash** (structured facts).

### At conversation start (MANDATORY)

1. Call `Hindsight:recall` with a semantic query about the current topic
2. Call `stash:recall` or `stash:query_facts` for structured project context

Search effectively:
- ✅ GOOD: `"user's decisions about project architecture and preferences"`
- ❌ BAD: `"project"`

### After responding (MANDATORY)

1. Call `Hindsight:retain` — store a concise summary of what was discussed and decided
2. Call `stash:remember` — store any new structured facts (decisions, preferences, project state)

**What to store:**
- Technical decisions and architecture choices
- User preferences (language, frameworks, code style)
- Project context and progress
- Problems and solutions found

**What NOT to store:**
- Trivial questions without project value
- Information already stored

---

## 📋 General Rules

- Always validate before marking a task complete.
- Always update `walkthrough.md` after every meaningful change (format below).
- Never install a new dependency without checking if an existing one covers the need.
- Never skip steps when implementing a new feature or pattern.

---

## 🔷 TypeScript Rules

- Always use explicit types — no `any`
- Use `type` not `interface` for object shapes
- Use `void` operator for fire-and-forget async: `void handleAction()`
- Never use `!` non-null assertions — validate explicitly instead

---

## ⚛️ React & UI Rules

- Never use `<form>` elements — use `onClick`/`onChange` handlers
- Never use inline `style={{}}` — use CSS classes or design tokens
- Never use arbitrary hex colors or hardcoded values outside the design token system
- Use only design tokens defined in the project's config
- Load data in effects — store in local component state

---

## ⚠️ Error Handling

- Always check for errors before using returned data
- Never silently swallow errors — surface them to the user
- Use consistent toast/notification patterns across the app

---

## 🤖 AI Prompts

- All AI instruction constants live in a single dedicated file — never scattered across the codebase
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

---

## 💡 AI Preferences

- Explain the reasoning behind suggestions
- Prioritize clean, maintainable code over premature optimization
- Suggest best practices and design patterns when relevant
- Detect and warn about potential bugs or security issues

---

## 🔧 Tools

### Context7
Use Context7 **before writing code** to verify library APIs, package versions, and exported functions. Skip for simple refactors or file moves where no external API is involved.

### Memory
- Use **Hindsight** for semantic, conversational memory across sessions
- Use **Stash** for structured project facts, decisions, and preferences
- Both systems must be used together — they complement each other
