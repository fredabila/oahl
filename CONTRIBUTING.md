# Contributing to OAHL

Thank you for your interest in contributing to the **Open Agent Hardware Layer**! OAHL is an open-source project and welcomes contributions from hardware developers, AI engineers, and protocol designers.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Ways to Contribute](#ways-to-contribute)
3. [Getting Started](#getting-started)
4. [Development Workflow](#development-workflow)
5. [Writing Adapters](#writing-adapters)
6. [Submitting Changes](#submitting-changes)
7. [Reporting Bugs](#reporting-bugs)
8. [Requesting Features](#requesting-features)
9. [Documentation](#documentation)
10. [Licensing](#licensing)

---

## Code of Conduct

Be respectful and constructive. Harassment, discrimination, or abusive behaviour of any kind will not be tolerated. By contributing you agree to treat all community members with dignity.

---

## Ways to Contribute

| Type | Examples |
|---|---|
| **Hardware adapters** | Build a new `@oahl/adapter-*` for a device class |
| **Transport plugins** | Implement a reusable `TransportProvider` (serial, BLE, gRPC, etc.) |
| **Core platform** | Bug fixes, test coverage, performance improvements in `packages/core`, `packages/server`, or `packages/cloud` |
| **SDKs** | Improve the JS or Python SDK; add a new language client |
| **Documentation** | Fix inaccuracies, add examples, improve guides in `docs/` |
| **Conformance tests** | Expand the test suite in `packages/core/test/conformance.test.js` |
| **Bug reports** | File a clear, reproducible issue |
| **Feature proposals** | Open a discussion before writing significant new code |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18 (LTS recommended)
- **npm** ≥ 9 (workspaces support)
- **TypeScript** ≥ 5 (installed as a dev dependency; no global install needed)
- **Git**

For hardware adapter work you will also need the appropriate driver toolchain for your target device (e.g., ADB for Android, `serialport` native bindings for serial, RTL-SDR binaries for SDR).

### Fork and clone

```bash
git clone https://github.com/fredabila/oahl.git
cd oahl
npm install
```

### Build all packages

```bash
npm run build
```

### Run the test suite

```bash
npm test
```

To run only the core conformance tests:

```bash
node --test packages/core/test/conformance.test.js
```

### Start a local node (for integration testing)

```bash
# Copy and edit the example config
cp oahl-config.example.json oahl-config.json

# Start the local hardware node
npm start
```

---

## Development Workflow

### Branch naming

| Branch type | Convention |
|---|---|
| Bug fix | `fix/<short-description>` |
| New feature | `feat/<short-description>` |
| New adapter | `adapter/<device-class>` |
| Documentation | `docs/<topic>` |
| Conformance / tests | `test/<scope>` |

### Monorepo layout

```
oahl/
├── packages/
│   ├── core/        # @oahl/core — interfaces, PolicyEngine, SessionManager, transport types
│   ├── server/      # @oahl/server — local node HTTP server + cloud relay client
│   ├── cloud/       # @oahl/cloud — cloud registry, relay, agent auth (deployed to Render)
│   ├── cli/         # @oahl/cli — `oahl` command-line tool
│   ├── sdk-js/      # @oahl/sdk — JavaScript/TypeScript agent SDK
│   └── web/         # @oahl/web — marketing and documentation site
├── adapters/
│   ├── adapter-mock/         # Simulated hardware (for testing)
│   ├── adapter-rtl-sdr/      # RTL2832U SDR dongle
│   └── adapter-usb-camera/   # USB/V4L2 cameras
├── sdk-python/      # Python agent SDK
├── docs/            # Protocol specs, guides, and reference docs
├── registry/        # Adapter registry (registry.json, adapters.txt, schemas)
└── examples/        # Example agent scripts
```

### TypeScript style

- All new code in `packages/` must be TypeScript.
- Follow the existing code style — no linter is currently enforced, but keep it consistent.
- Adapter packages may be JavaScript if a TypeScript setup is impractical for the target hardware library.
- Do not use `any` in `@oahl/core`; prefer proper interface types.

### Commit messages

Follow conventional commit style:

```
feat(adapter): add transport-aware BLE adapter scaffold
fix(cloud): handle Redis timeout on brPop gracefully
docs(protocol): add SSE streaming gap to security roadmap
test(conformance): add execution result envelope validation
```

---

## Writing Adapters

Adapters are the most common type of contribution. Each adapter is a standalone npm package that implements the `Adapter` interface from `@oahl/core`.

**Quick start with the scaffold:**

```bash
oahl create-adapter my-device
```

**Full guide:** `docs/adapter-development.md`

**Key rules for adapter PRs:**

1. Must implement all 5 `Adapter` methods: `initialize`, `healthCheck`, `getDevices`, `getCapabilities`, `execute`.
2. Every capability MUST include a `schema` field (JSON Schema for its `params`).
3. Capability names MUST follow lowercase dot-notation: `<domain>.<action>` (e.g. `sensor.read`).
4. Must return execution results that conform to `oahl-execution-result.schema.json`.
5. Must include a `README.md` and an `oahl-manifest.json` to be listed in the registry (see `docs/adapter-development.md` Section 5).
6. Transport logic SHOULD use the `TransportProvider` interface from `@oahl/core` rather than ad-hoc in-adapter connection handling.

**To list your adapter in the registry:**
Open a PR to add your npm package name to `registry/adapters.txt`. The registry crawler will fetch the manifest automatically.

---

## Submitting Changes

1. **Open an issue first** for any non-trivial change so we can discuss the approach before you write the code.
2. **Keep PRs focused** — one logical change per PR. Split large changes into a series of smaller PRs.
3. **Tests** — include or update conformance/unit tests for any change to `packages/core`. Integration test scripts (in `examples/`) are welcome for adapter PRs.
4. **Documentation** — update the relevant `docs/` file if your change affects user-visible behaviour, the protocol contract, or the OpenAPI spec.
5. **OpenAPI** — if you add or change an API endpoint, update `openapi.yaml` accordingly.
6. **Build passes** — run `npm run build` before opening the PR. TypeScript compile errors will block merge.

### PR checklist

- [ ] `npm run build` passes with no TypeScript errors
- [ ] `npm test` passes (or explains why a test is skipped)
- [ ] New capabilities or API changes are reflected in `openapi.yaml`
- [ ] New protocol-level changes are reflected in `docs/oahl-protocol-v1.md`
- [ ] `oahl-manifest.json` included for new adapter packages
- [ ] `README.md` included or updated for adapter packages
- [ ] No credentials, API keys, or personal data in committed files

---

## Reporting Bugs

Open a GitHub issue with:

1. **Description** — what happened vs. what you expected
2. **Reproduction steps** — minimal config and commands to reproduce
3. **Environment** — OS, Node.js version, OAHL version, adapter versions
4. **Logs** — relevant server or node console output (redact any API keys)

---

## Requesting Features

Open a GitHub Discussion (not an issue) for feature requests. Describe:
- The use case you are trying to solve
- How the feature fits the OAHL protocol model
- Whether you are willing to contribute the implementation

Significant protocol-level changes (new lifecycle steps, new canonical fields, new security controls) will go through a lightweight RFC process. Post a `[RFC]`-prefixed Discussion and give the community at least two weeks to review before implementation begins.

---

## Documentation

`docs/` contributions are always welcome. Keep the following in mind:

- `docs/oahl-protocol-v1.md` is the authoritative protocol spec. Only modify it if you are making a genuine protocol change — not just improving prose.
- `openapi.yaml` is the source of truth for the agent-facing REST API contract.
- `docs/security-guide.md` must accurately reflect the current implemented vs. planned security posture. Do not document a control as "implemented" unless it exists in the codebase.
- `docs/wot-alignment.md` documents the relationship to W3C WoT. Update it if new WoT-aligned fields are added.

---

## Licensing

By submitting a contribution to this repository you agree that your contribution is licensed under the **MIT License** (see `LICENSE`). All contributions must be your own original work or appropriately licensed third-party code.

If your adapter depends on GPL-licensed native binaries at runtime (e.g., RTL-SDR tools), document that clearly in the adapter's `README.md`. The adapter package code itself should remain MIT.
