# @oahl/server

The local hardware node server for the **Open Agent Hardware Layer (OAHL)**.

This is the daemon that runs on the hardware owner's machine (laptop, Raspberry Pi, server). It reads your `oahl-config.json`, loads the appropriate hardware adapters, and safely exposes your physical devices as standardized capabilities (like `camera.capture`) via a local API.

## Installation

```bash
npm install -g @oahl/server
```

## Usage

You must have an `oahl-config.json` file in your current directory. (You can generate one easily using `@oahl/cli`).

To start the node:
```bash
# Ensure your config file is in the current directory, then run:
npm start -w @oahl/server
```
*(Note: A global CLI command like `oahl start` is the recommended way to wrap this execution).*

## What is OAHL?
OAHL is an open-source framework that lets hardware owners safely expose physical capabilities (like taking pictures or scanning radio frequencies) to remote AI agents. 

For the full documentation, visit the [main OAHL repository](https://github.com/fredabila/oahl).
