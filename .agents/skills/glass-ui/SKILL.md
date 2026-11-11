---
name: glass-ui
description: Build or refine Fuori Contesto's Apple-inspired React interface, including the shared table, phone hand, game dialogs and responsive behavior.
---

Read `docs/design.md`, `src/main.tsx` and `src/style.css`. Keep the visual hierarchy: warm canvas, charcoal typography, restrained lime accent, solid cards and translucent controls. This is web styling, not native Apple Liquid Glass; do not redistribute Apple proprietary fonts or symbols.

The host screen must be readable from across a table and never show a private hand. The phone prioritizes prompt, ordered selection and the play button. Keep UI text Italian and show real connection/error/empty states. Never fake players, scores or room data outside an explicitly identified test fixture.

Use semantic controls and native dialog behavior, visible focus and pressed state. Retain reduced-motion and increased-contrast handling. Do not use color alone for selection or connection state. Verify card order with two- and three-answer prompts, long text, 24-character names and disabled submission.

Inspect home, lobby, active hand, judging and result states in the actual browser. Test a viewport near 390 px and a desktop view when tools support it. Record limitations honestly. Save representative screenshots for significant visual changes, without actual participant data. Run type checks/build after code changes; use existing engine tests if protocol behavior is affected.
