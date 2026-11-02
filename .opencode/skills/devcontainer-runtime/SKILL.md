---
name: devcontainer-runtime
description: Use before starting services or running database-, browser-, or container-dependent work in a devcontainer, and when diagnosing its runtime failures.
---

# Devcontainer runtime

Use this skill before starting services or running checks that depend on containers, databases or browsers. For other tasks, load it only when runtime preparation or diagnosis becomes relevant. Run from the same environment and with the same configuration as the application or test process; do not expose secrets in commands, output or evidence.

## Discover and prepare

1. Read project setup and testing documentation, devcontainer and Compose configuration, environment variable names and actual package scripts. Identify the intended runner, services, ports, credentials source, migrations and browser tooling. Use existing documented project commands first; do not invent universal endpoints or orchestration.
2. Identify the Docker daemon and network topology. A mounted host Docker socket controls the host daemon but does not put the devcontainer in the host network namespace. Docker-in-Docker instead uses a daemon inside its own container or environment; inspect its networks and published ports independently. Verify the runner's network namespace and service network membership, port bindings and routes rather than inferring them from daemon access.
3. Choose an endpoint from the runner's perspective. `localhost` reaches only its own network namespace, or a namespace explicitly shared with the service. Compose service DNS works when the runner and service share the relevant Docker network. A host-published service may require a verified reachable host gateway and published port; `host.docker.internal` is platform/configuration dependent, not a universal answer. Inspect actual bindings and test the chosen address from the runner. Use the narrowest binding reachable in the verified topology; do not default to all host interfaces.
4. Start only the required services using documented commands. Health status is useful but does not prove the test process can reach or authenticate to the service. From the runner, use the project's client or connectivity check with its actual test configuration; verify database existence, authentication and migration/schema readiness using project-owned commands. Apply documented non-destructive migrations to the intended development/test database only, after checking the target.
5. For browser checks, inspect the project's Playwright version and configuration, required browser binaries and operating-system libraries. Run its documented installation or verification commands in the environment that runs the browser. If prerequisites are missing, apply documented recoverable setup with appropriate permissions, then verify a browser can launch before running an expensive suite.

## Reproducible project preflight

Projects should own a documented, repeatable setup/preflight entry point, built from their existing scripts where possible. It should identify prerequisites and topology, start only required services, wait for readiness with bounded retries, check connectivity and authentication from the actual runner, prepare or verify migrations against the intended test database, and verify required browser binaries and system libraries when browser tests apply. It should fail clearly with actionable diagnostics and a nonzero status, avoid logging secrets, and be safe to repeat without deleting data. Document invocation, configuration, expected results and any separately authorized steps. The kit provides guidance, not a project-specific preflight or service configuration. If no entry point exists, use the documented individual steps and report the integration gap; do not claim one exists.

## Diagnose and recover

Compare the failing process's endpoint and environment with observed network and port bindings. For example, a healthy PostgreSQL container on the host daemon does not make `127.0.0.1:55432` reachable inside the devcontainer: verify the gateway and reachable published port, then test the connection and migrations from the test runner. A subsequent missing Chromium error is a separate browser prerequisite: install the project-documented matching browser and dependencies, verify launch, and rerun affected checks.

Apply documented, reversible setup and retry the narrow failing check before declaring infrastructure blocked. Preserve database volumes and existing data, intentional overlapping mounts and host-owned authentication. Do not reset databases, remove volumes, prune Docker resources or change global configuration as a default recovery. Investigate unknown targets and request authorization before destructive or otherwise unapproved changes. Report commands and sanitized evidence, actual failures, remedies attempted and remaining blockers; distinguish service health, runner connectivity, migrations, browser launch and full-suite results.
