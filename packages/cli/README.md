# @oahl/cli

The command-line interface for the **Open Agent Hardware Layer (OAHL)**. 

This tool provides an interactive wizard for hardware owners to easily configure their hardware nodes, set up safety policies, and expose devices to AI agents without having to write code or manually edit JSON files.

## Installation

```bash
npm install -g @oahl/cli
```

## Usage

### Initialize a new Node

Run the interactive setup wizard to generate your `oahl-config.json`:

```bash
oahl init
```

The wizard will ask you for:
- Your node name and provider details
- The type of hardware you are connecting (e.g., USB Camera, RTL-SDR)
- Privacy and security policies for the device

### What is OAHL?
OAHL is an open-source framework that lets hardware owners safely expose physical capabilities (like taking pictures or scanning radio frequencies) to remote AI agents. 

For the full documentation, visit the [main OAHL repository](https://github.com/fredabila/oahl).
