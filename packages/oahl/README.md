# oahl (Open Agent Hardware Layer)

The official all-in-one toolkit for the **Open Agent Hardware Layer (OAHL)**. 

Installing this meta-package globally will automatically install both the interactive **CLI wizard** (`@oahl/cli`) and the **Local Node Server** (`@oahl/server`) on your machine.

## Installation

```bash
npm install -g @fredabila/oahl
```

## Quick Start for Hardware Owners

### 1. Run the Setup Wizard
```bash
oahl init
```
This interactive wizard asks you plain-English questions about your hardware (e.g. USB Camera, RTL-SDR) and automatically generates the necessary safety policies and configurations.

### 2. Start your Local Node
```bash
# In the directory where you generated your config:
npm start -w @oahl/server
```
*(Your hardware is now safely exposed to the Cloud Registry as a standardized capability!)*

## What is OAHL?
OAHL is an open-source framework that lets hardware owners safely expose physical capabilities (like taking pictures or scanning radio frequencies) to remote AI agents without needing to write complex driver integrations. 

For the full documentation, visit the [main OAHL repository](https://github.com/fredabila/oahl).
