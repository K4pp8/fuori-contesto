---
name: italian-decks
description: Add or review Italian cards for Fuori Contesto, or maintain its licensed historical deck importer and JSON validation.
---

Read `docs/decks.md`, `server/decks.ts` and the target deck. Preserve stable IDs. Increment the deck version according to the scope of change. Keep prompts' `pick` values consistent with ordered blank counts and preserve metadata: source, attribution, language, maturity and license.

Write original Italian content with reusable grammatical forms. Check several random prompt/answer combinations for coherence and avoid duplicates. Do not claim AI-generated jokes are the maintainer's writing; disclose assistance in metadata or contribution notes. Do not copy commercial expansions without reuse permission.

The historical source is explicitly old and noncommercial. Its importer is opt-in, pinned to a reviewed commit and must stop on unknown LaTeX or an unexpected license. Do not replace it with an unreviewed remote feed or fetch on install/start. An update requires comparing content, counts, credits and license before changing the pinned revision. Never commit local `legacy-it.json` by accident.

Run `npm run decks:validate` and relevant importer tests. Test importer changes against the pinned public source only when network access is available; report if not tested. Use `--replace` only when intentionally replacing saved local changes. Existing rooms keep their embedded deck; restart the server to load updates for new rooms.
