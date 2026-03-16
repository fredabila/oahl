# OAHL Adapter Registry

Welcome to the central registry for **Open Agent Hardware Layer (OAHL)** adapters.

This repository serves as the source of truth for the [OAHL Marketplace](https://oahl.org/marketplace).

## 🚀 How to Submit your Adapter

We welcome community-contributed adapters! To list your adapter here, follow these steps:

### 1. Fork and Clone
Fork this repository and clone it to your local machine.

### 2. Create your Metadata File
Create a new JSON file in the `adapters/` directory. The filename should be your adapter's ID (e.g., `my-cool-sensor.json`).

### 3. Follow the Schema
Your JSON file must follow the standard schema. Here is a template:

```json
{
  "id": "oahl-adapter-my-sensor",
  "name": "My Cool Sensor Adapter",
  "description": "Exposes temperature and humidity data to AI agents.",
  "author": "your-github-username",
  "repository": "https://github.com/your-username/oahl-adapter-my-sensor",
  "npm_package": "@your-org/oahl-adapter-my-sensor",
  "hardware_tags": ["sensor", "i2c", "environment"],
  "capabilities": ["sensor.read_temperature", "sensor.read_humidity"],
  "license": "MIT"
}
```

- **id**: Must start with `oahl-adapter-` and use lowercase alphanumeric characters and hyphens.
- **name**: A clear, human-readable name.
- **hardware_tags**: Helpful for users searching the marketplace.
- **capabilities**: List the standard OAHL capabilities your adapter implements.

### 4. Validate (Optional but Recommended)
If you have `ajv-cli` or a similar tool, you can validate your file against `schemas/adapter.schema.json`.

### 5. Submit a Pull Request
Commit your changes and push them to your fork. Create a Pull Request to this repository.

Our maintainers will review the submission and merge it if it meets the standards. Once merged, it will automatically appear on the [OAHL Marketplace](https://oahl.org/marketplace).

## 🌟 How to get Featured

The Marketplace includes a scrolling "Featured Adapters" section at the top of the page. This is reserved for high-quality, well-documented, and actively maintained adapters.

To have your adapter featured:
1. Ensure your adapter is fully functional and includes a comprehensive `README.md` in its repository.
2. The adapter must have clear, standard capability mappings.
3. Open an **Issue** or **Pull Request** in this repository requesting featured status.
4. If approved, a maintainer will add `"featured": true` to your adapter's JSON metadata file.

## 🛠️ Validation Rules
- The JSON must be valid.
- The `id` must be unique.
- The `repository` must be a public, valid URL.
- The `author` must be a valid GitHub handle.

## 📄 License
By submitting to this registry, you agree that your metadata (this JSON file) is licensed under the CC0 1.0 Universal license. The adapter code itself should specify its own license.
