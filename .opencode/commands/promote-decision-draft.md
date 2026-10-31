---
description: Validate and promote a draft decision record
---

Take $1 as a draft path. Read @docs/decisions/00000-decision-records-and-governance.md and @docs/decisions/template.md. Verify draft status, metadata, references and effects. Ensure no direct edits to accepted decisions. Review contradictions and the draft's authored `# Effective Architecture` section with a human before promotion; deterministic tooling cannot certify semantic agreement. Run `node tools/cli.mjs promote "$1" --reviewed` after explicit review, then `pnpm test:arch` and `pnpm test:tools`. The promotion writes the accepted record, index and category compaction together. Commit only on user request.
