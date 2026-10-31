---
name: github-authentication
description: Use before any GitHub REST request that needs repository authentication. Derives request-scoped credentials from the HTTPS origin push remote without exposing, persisting, or changing them.
---

# GitHub Authentication

Use this procedure only for an authorized GitHub REST workflow.

1. Obtain the `origin` push URL in process. Do not display, log, write, or pass its raw value through a tool output that may expose credentials.
2. Validate the credential source: require a credential-bearing HTTPS GitHub `origin` push URL with an unambiguous owner/repository path matching the current checkout's expected origin. Reject any other scheme, host, missing credential, or ambiguous or unexpected origin path.
3. Decode the URL userinfo safely. Prefer its password as the credential when present; otherwise use its username.
4. Supply the credential only to the individual GitHub REST request. Keep it in process, do not persist it, and do not modify Git remotes, credential configuration, or authentication state.
5. Fail closed when validation, authentication, authorization, or the REST request fails. Report only the non-sensitive failure result.
6. Identify the request's target owner/repository from the user's explicit request or the current workflow. A user-selected target may differ from the validated origin repository: use the same origin-derived credential for that target when authorized, without changing remotes. Validate the target and operation before the request and fail closed if either is ambiguous or access is denied.
7. Confirm explicit user authorization before any state-changing GitHub request. Reading issues, pull requests, or checks does not authorize creating, editing, closing, pushing, or merging.

Use `Authorization: Bearer <credential>` for GitHub REST requests when the derived value is a personal access token. Never include the credential in command text, output, issue bodies, commits, logs, or files.

The credential-bearing remote pattern has local process and configuration exposure risks. Prefer a non-credentialed remote with an appropriate credential helper when the project can support it. Do not substitute another authentication method or change remotes without explicit user instruction.
