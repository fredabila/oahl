# @oahl/core

Shared types, interfaces, and core domain logic for the **Open Agent Hardware Layer (OAHL)**.

This package contains the foundational building blocks used by the OAHL ecosystem, including:
- Standardized Types (`Device`, `Capability`, `Session`, `Policy`)
- `PolicyEngine` for validating safe hardware operations.
- `SessionManager` for handling hardware reservations and lifecycle.

If you are building custom hardware adapters for OAHL, you will import interfaces from this package.

## Installation

```bash
npm install @oahl/core
```

## What is OAHL?
OAHL is an open-source framework that lets hardware owners safely expose physical capabilities (like taking pictures or scanning radio frequencies) to remote AI agents. 

For the full documentation, visit the [main OAHL repository](https://github.com/fredabila/oahl).
