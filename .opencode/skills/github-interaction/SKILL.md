---
name: github-interaction
description: Use for agent-operated GitHub issue, pull request, and exact-head CI interactions, including endpoint selection, permissions, and failure diagnosis.
---

# GitHub interaction

Load `github-authentication` first and follow its credential validation, request-scoping, authorization and fail-closed rules. For an individual `gh` invocation, pass the validated origin-derived credential as `GH_TOKEN` and the selected `OWNER/REPO` as `GH_REPO` in that process environment only. Alternatively use a request-scoped REST Bearer header. Never put a credential in arguments, logs, persisted configuration, body files, or a displayed remote URL; do not run `gh auth login`, change remotes, or select another credential source. Confirm user authorization before mutations. Never merge automatically.

## Operations and fine-grained repository permissions

Permissions below apply to the selected target repository; GitHub also grants Metadata: Read automatically. Git host access and branch rules still apply. Use `OWNER/REPO` for the unambiguous target selected by the user or workflow. The target may differ from the validated credential-source origin when the requested operation is authorized and the credential has access. For example, an explicitly requested issue in `owner/other-repo` can be addressed with the current checkout's validated origin credential; verify the response identifies `owner/other-repo` and do not change the origin. Git fetch and push still operate on the specified Git remote, not the REST target implied by a separate request.

| Operation | Mechanism | Permission |
| --- | --- | --- |
| Read approved issue | `gh api repos/OWNER/REPO/issues/NUMBER` | Issues: Read |
| Inspect PR and reviews | `gh api repos/OWNER/REPO/pulls/NUMBER` and `/pulls/NUMBER/reviews` or `/pulls/NUMBER/comments` | Pull requests: Read |
| Fetch base or push branch | `git fetch origin BASE`; `git push -u origin BRANCH`, with existing approved Git authentication | Contents: Read for fetch, Write for push; Workflows: Write only when updating `.github/workflows/` |
| Validate closing lines | Local `tools/pr-body.mjs render` and `check` immediately before creation | None |
| Create PR | `gh pr create --repo OWNER/REPO --base BASE --head BRANCH --title TITLE --body-file BODY_FILE`; add `--draft` when required | Pull requests: Write |
| Verify PR | `gh api repos/OWNER/REPO/pulls/NUMBER`; check persisted body locally and inspect draft flag and head SHA | Pull requests: Read |
| Repair PR when authorized | `gh api -X PATCH repos/OWNER/REPO/pulls/NUMBER`, then re-fetch and re-check | Pull requests: Write |
| Inspect exact-head Actions CI | `gh api 'repos/OWNER/REPO/actions/runs?head_sha=FULL_SHA&per_page=100'`, then `/actions/runs/RUN_ID` and `/actions/runs/RUN_ID/jobs`; `gh run view RUN_ID --repo OWNER/REPO --log-failed` when needed | Actions: Read |
| Retry CI | Fix, commit and push; use `gh run rerun RUN_ID --repo OWNER/REPO` only when explicitly authorized and appropriate | Contents: Write for push; Actions: Write only for rerun |
| Create or edit issue when requested | `gh issue create --repo OWNER/REPO --title TITLE --body-file BODY_FILE` or `gh issue edit NUMBER ...` | Issues: Write |
| Read or download a private release in a consumer | `gh release view TAG --repo OWNER/REPO --json assets,tagName,url` or `gh release download TAG --repo OWNER/REPO --pattern PATTERN --dir TARGET` | Contents: Read using the consumer-supplied `GH_TOKEN`, separate from agent authentication |
| Publish a reviewed tagged release | Existing release workflow uses `gh release create ... --verify-tag` | Job-scoped `GITHUB_TOKEN` Contents: Write, not a solve PAT grant |

Typical solve permissions are Issues: Read, Pull requests: Write, Actions: Read and Contents: Write, plus automatic Metadata: Read. Issues: Write, Workflows: Write and Actions: Write are conditional on the specific authorized mutation, not baseline grants. Follow `pr-creation` for approved issue scope, standalone closing references and persisted-body verification.

## Evidence and failures

For CI proof fetch the current PR head SHA and compare it with each returned `workflow_run.head_sha`. Require `status=completed`, `conclusion=success`, and the expected workflow and jobs. Inspect all relevant pages. This proves only those Actions workflows; external required checks need separate supported inspection or remain unverified. Recheck after any head change. Do not default to `gh pr checks` or `/commits/SHA/check-runs`: the Checks API may require Checks: Read even when Actions: Read is sufficient for Actions runs.

Isolate a failed endpoint. For 401 or 403 report the endpoint, status, sanitized GitHub error, `X-Accepted-GitHub-Permissions`, and relevant rate-limit headers without tokens or credential-bearing URLs. Distinguish missing permission, endpoint limitation and rate limiting only when supported by evidence. Stop on a failed required request. A denied optional endpoint is not a pass; an independently authorized successful endpoint may establish only its own narrow claim. Do not silently broaden permissions or change credential source.
