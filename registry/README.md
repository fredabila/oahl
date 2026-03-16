# OAHL Adapter Registry

This directory is the source of truth for the **Open Agent Hardware Layer** adapter ecosystem. It powers the [OAHL Marketplace](https://oahl.org/marketplace) and the cloud registry crawler.

---

## How the Registry Works

The registry is **crawler-based** — you do not submit JSON files directly. Instead:

1. You publish your adapter to **npm** with an `oahl-manifest.json` in the package root.
2. You open a PR to add your npm package name to [`adapters.txt`](./adapters.txt).
3. The crawler (`scripts/generate-registry.mjs`) fetches each package from npm, reads its `oahl-manifest.json`, and auto-generates [`registry.json`](./registry.json).
4. `registry.json` is copied into the Marketplace UI at build time.

You never manually edit `registry.json` — it is generated.

---

## Currently Listed Adapters

| Package | Hardware | Key Capabilities |
|---|---|---|
| [`@oahl/adapter-usb-camera`](https://www.npmjs.com/package/@oahl/adapter-usb-camera) | USB / V4L2 cameras | `camera.capture`, `camera.stream` |
| [`@oahl/adapter-rtl-sdr`](https://www.npmjs.com/package/@oahl/adapter-rtl-sdr) | RTL2832U SDR dongles | `radio.scan`, `radio.capture` |
| [`@oahl/adapter-mock`](https://www.npmjs.com/package/@oahl/adapter-mock) | Simulated hardware | `mock.ping`, `mock.echo` |
| [`@oahl/adapter-android`](https://www.npmjs.com/package/@oahl/adapter-android) | Android devices via ADB | 60+ capabilities: camera, sensors, UI, SMS, screen, files, system |

---

## Publishing Your Own Adapter

### Step 1 — Build a compliant adapter

Your adapter must implement the `Adapter` interface from `@oahl/core`. See the full guide in [`docs/adapter-development.md`](../docs/adapter-development.md).

Quick rules:
- Every capability MUST have a `schema` field (JSON Schema for its params).
- Capability names MUST follow `<domain>.<action>` dot-notation (e.g. `sensor.read`).
- Execution results MUST conform to `oahl-execution-result.schema.json`.
- Must export the adapter class as the default export.

### Step 2 — Add an `oahl-manifest.json` to your package

This file is how the crawler discovers your adapter's metadata. Place it in the root of your npm package:

```json
{
  "id": "oahl-adapter-my-device",
  "name": "My Device Adapter",
  "description": "Exposes temperature and humidity readings to AI agents via I2C.",
  "author": "your-github-username",
  "repository": "https://www.npmjs.com/package/@your-org/oahl-adapter-my-device",
  "npm_package": "@your-org/oahl-adapter-my-device",
  "hardware_tags": ["sensor", "i2c", "environment"],
  "capabilities": ["sensor.read_temperature", "sensor.read_humidity"],
  "license": "MIT"
}
```

**Field reference:**

| Field | Required | Description |
|---|---|---|
| `id` | ✅ | Must be `oahl-adapter-<slug>` — lowercase, hyphens only |
| `name` | ✅ | Human-readable display name |
| `description` | ✅ | One-sentence summary for the marketplace card |
| `author` | ✅ | GitHub username or org name |
| `repository` | ✅ | Public URL to source code or npm page |
| `npm_package` | ✅ | Exact npm package name (used for `oahl install`) |
| `hardware_tags` | ✅ | Searchable tags: device class, protocol, platform |
| `capabilities` | ✅ | Dot-notation capability names the adapter exposes |
| `license` | ✅ | SPDX license identifier (e.g. `MIT`, `Apache-2.0`) |
| `pypi_package` | ❌ | If a Python companion package exists |
| `featured` | ❌ | Set by the OAHL team — do not self-assign |
| `readme_url` | ❌ | Direct URL to README (auto-filled from unpkg if omitted) |
| `version` | ❌ | Auto-filled by the crawler from the npm registry |

Validate your manifest against the schema before submitting:

```bash
npx ajv-cli validate -s registry/schemas/adapter.schema.json -d path/to/oahl-manifest.json
```

### Step 3 — Publish to npm

```bash
npm publish --access public
```

Make sure the `oahl-manifest.json` is included in the published package (not in `.npmignore`).

### Step 4 — Open a PR to `adapters.txt`

Add a single line with your npm package name to [`adapters.txt`](./adapters.txt):

```
@your-org/oahl-adapter-my-device
```

That's it. The crawler will handle the rest on the next registry build.

---

## How to Get Featured

The Marketplace shows a **Featured Adapters** section for high-quality, well-maintained adapters. To be considered:

1. Adapter must be fully functional and actively maintained.
2. Include a comprehensive `README.md` covering setup, capabilities, and example usage.
3. All capabilities must have clear `description` and `schema` fields.
4. Open an Issue in this repository requesting featured status, with a link to the adapter and a short explanation.
5. If approved, an OAHL maintainer will set `"featured": true` in the generated `registry.json`.

---

## Schema Validation Rules

Metadata must conform to `schemas/adapter.schema.json`. Key rules:

- `id` must match `^oahl-adapter-[a-z0-9-]+$`
- `id` must be unique across all registered adapters
- `repository` must be a valid public URL
- `capabilities` must only contain standard dot-notation names
- `license` must be a valid SPDX identifier

---

## Files in This Directory

| File / Folder | Purpose |
|---|---|
| `adapters.txt` | One npm package name per line — the crawler input list |
| `registry.json` | **Auto-generated** — do not edit manually |
| `schemas/adapter.schema.json` | JSON Schema for `oahl-manifest.json` validation |
| `scripts/generate-registry.mjs` | The crawler script (`npm run generate:registry`) |

---

## License

Adapter metadata contributed to this registry (the `oahl-manifest.json` content) is licensed under [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) — effectively public domain. The adapter code itself is subject to its own declared license.
