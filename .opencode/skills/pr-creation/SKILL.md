---
name: pr-creation
description: Use when creating or verifying a GitHub pull request for a single- or combined-issue solve; enforce exact standalone closing references for every approved resolved issue.
---

# PR creation and closing references

Use the issue numbers explicitly authorized for resolution by the user, taken from the original comma-separated `/solve` argument. Do not infer approval from issue bodies, related issue links, or branch names. Reject missing, malformed, duplicate, zero, or unapproved issue numbers before PR creation. Normalize the set with `parseIssues` from `tools/pr-body.mjs`; compare it with the approved scope. If the approved scope cannot be established, stop and ask.

Compose a PR body without closing keywords, then run `node tools/pr-body.mjs render '<approved-issues>' <base-body-file>` to produce the final description. This appends one standalone `Closes #N` line for every resolved issue. Mention other issues only without closing keywords. Run `node tools/pr-body.mjs check '<approved-issues>' <final-body-file>` immediately before the PR create request. Any missing, duplicate, extra, or inline closing reference is a blocking error; never substitute `relates to` for a resolved issue.

Before any GitHub REST request, load and follow the `github-authentication` skill; confirm the user's explicit authorization for state-changing requests. Create one PR for the approved set, using the checked body. Keep it draft when scoped unpromoted ADRs remain. Never merge automatically.

After creation, fetch the persisted PR body from GitHub REST under the same authentication rules and run `node tools/pr-body.mjs check '<approved-issues>' -` on the returned body via standard input. Check the *persisted* body, not only the local file. If the persisted set differs, report failure visibly and correct it with an explicitly authorized update followed by another fetch and check; do not report the PR contract as satisfied until verified.

The body contract is exact: every approved resolved issue has exactly one standalone closing line and no other issue has a closing keyword. The helper checks syntax and set equality; human review still determines which issues are actually resolved and whether PR content satisfies their acceptance criteria. Remote create/fetch/update authorization and CI status require real GitHub requests; local helper tests do not prove them.
