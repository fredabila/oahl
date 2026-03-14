#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const prompts_1 = __importDefault(require("prompts"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const program = new commander_1.Command();
program
    .name('oahl')
    .description('CLI to manage Open Agent Hardware Layer (OAHL) nodes and configs')
    .version('0.1.0');
program
    .command('init')
    .description('Interactively create a new oahl-config.json file for your hardware node')
    .action(async () => {
    console.log('🤖 Welcome to the OAHL Node Setup Wizard!\n');
    const response = await (0, prompts_1.default)([
        {
            type: 'text',
            name: 'nodeId',
            message: 'What is the unique ID for this node? (e.g. my-laptop-01)',
            initial: 'local-node-01'
        },
        {
            type: 'text',
            name: 'providerName',
            message: 'What is your provider name? (e.g. Accra Test Lab)',
            initial: 'Local Lab'
        },
        {
            type: 'select',
            name: 'deviceType',
            message: 'What type of hardware device are you connecting first?',
            choices: [
                { title: 'USB Camera', value: 'camera' },
                { title: 'RTL-SDR Radio', value: 'radio' },
                { title: 'Mock / Virtual Sensor', value: 'mock' },
                { title: 'Skip for now', value: 'none' }
            ]
        }
    ]);
    const config = {
        node_id: response.nodeId,
        provider: {
            name: response.providerName
        },
        plugins: [
            "@oahl/adapter-mock"
        ],
        devices: []
    };
    if (response.deviceType !== 'none') {
        let adapter = 'mock';
        let capabilities = [];
        let localPath = '';
        if (response.deviceType === 'camera') {
            adapter = 'usb-camera';
            capabilities = ['camera.capture', 'camera.stream'];
            localPath = '/dev/video0';
            config.plugins.push("@oahl/adapter-usb-camera");
        }
        else if (response.deviceType === 'radio') {
            adapter = 'rtl-sdr';
            capabilities = ['radio.scan', 'radio.measure_power'];
            config.plugins.push("@oahl/adapter-rtl-sdr");
        }
        else if (response.deviceType === 'mock') {
            adapter = 'mock-sensor';
            capabilities = ['sensor.read'];
        }
        const deviceRes = await (0, prompts_1.default)([
            {
                type: 'text',
                name: 'deviceId',
                message: `Enter an ID for your ${response.deviceType}:`,
                initial: `${response.deviceType}-01`
            },
            {
                type: 'confirm',
                name: 'isPublic',
                message: 'Should this device be public (usable by remote agents)?',
                initial: false
            }
        ]);
        const deviceConfig = {
            id: deviceRes.deviceId,
            type: response.deviceType,
            adapter: adapter,
            capabilities: capabilities,
            policy: {
                public: deviceRes.isPublic,
                max_session_minutes: 30
            }
        };
        if (localPath) {
            deviceConfig.local_path = localPath;
        }
        config.devices.push(deviceConfig);
    }
    const configPath = path.join(process.cwd(), 'oahl-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`\n✅ Successfully generated configuration at: ${configPath}`);
    console.log(`\n🚀 Next steps:`);
    console.log(`1. Review your newly created oahl-config.json`);
    console.log(`2. Start the local node using:`);
    console.log(`   oahl start\n`);
});
program
    .command('install <adapter>')
    .description('Install a new hardware adapter plugin')
    .action((adapter) => {
    console.log(`📦 Installing adapter: ${adapter}...`);
    try {
        (0, child_process_1.execSync)(`npm install ${adapter}`, { stdio: 'inherit' });
        // Add to config if exists
        const configPath = path.resolve(process.cwd(), 'oahl-config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (!config.plugins)
                config.plugins = [];
            if (!config.plugins.includes(adapter)) {
                config.plugins.push(adapter);
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                console.log(`✅ Added ${adapter} to oahl-config.json plugins list.`);
            }
        }
        console.log(`\n✨ Successfully installed ${adapter}. Restart your node to enable it.`);
    }
    catch (err) {
        console.error(`\n❌ Failed to install adapter: ${err.message}`);
    }
});
program
    .command('remove <adapter>')
    .description('Remove a hardware adapter plugin')
    .action((adapter) => {
    console.log(`🗑️ Removing adapter: ${adapter}...`);
    try {
        (0, child_process_1.execSync)(`npm uninstall ${adapter}`, { stdio: 'inherit' });
        const configPath = path.resolve(process.cwd(), 'oahl-config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.plugins) {
                config.plugins = config.plugins.filter((p) => p !== adapter);
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                console.log(`✅ Removed ${adapter} from oahl-config.json plugins list.`);
            }
        }
        console.log(`\n✨ Successfully removed ${adapter}.`);
    }
    catch (err) {
        console.error(`\n❌ Failed to remove adapter: ${err.message}`);
    }
});
program
    .command('create-adapter <name>')
    .description('Scaffold a new OAHL adapter package in the current workspace')
    .option('-d, --dir <path>', 'Directory to create the adapter in', '.')
    .action(async (name, options) => {
    const packageName = name.startsWith('@') ? name.split('/').pop() || name : name;
    const normalizedPackageName = packageName.startsWith('adapter-') ? packageName : `adapter-${packageName}`;
    const className = normalizedPackageName
        .split(/[^a-zA-Z0-9]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('') + 'Adapter';
    const targetDir = path.resolve(process.cwd(), options.dir, normalizedPackageName);
    const srcDir = path.join(targetDir, 'src');
    if (fs.existsSync(targetDir)) {
        console.error(`❌ Target folder already exists: ${targetDir}`);
        process.exit(1);
    }
    fs.mkdirSync(srcDir, { recursive: true });
    const packageJson = {
        name: `@oahl/${normalizedPackageName}`,
        version: '0.1.0',
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
        scripts: {
            build: 'tsc',
            start: 'node dist/index.js'
        },
        peerDependencies: {
            '@oahl/core': '*'
        },
        devDependencies: {
            typescript: '^5.0.0',
            '@types/node': '^20.10.0'
        }
    };
    const tsconfig = {
        extends: '../../tsconfig.base.json',
        compilerOptions: {
            outDir: './dist',
            rootDir: './src',
            declaration: true
        },
        include: ['src/**/*']
    };
    const adapterSource = `import { Adapter, Device, Capability } from '@oahl/core';

export default class ${className} implements Adapter {
  id = '${normalizedPackageName}';

  async initialize(): Promise<void> {
    console.log('[${normalizedPackageName}] Initialized');
  }

  async healthCheck(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    return { status: 'ok' };
  }

  async getDevices(): Promise<Device[]> {
    return [
      {
        id: '${normalizedPackageName}-device-01',
        type: 'custom',
        name: '${className} Device',
        isPublic: false
      }
    ];
  }

  async getCapabilities(deviceId: string): Promise<Capability[]> {
    if (deviceId !== '${normalizedPackageName}-device-01') {
      throw new Error('Device not found');
    }

    return [
      {
        name: 'custom.ping',
        description: 'Smoke-test capability for this adapter',
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    ];
  }

  async execute(deviceId: string, capabilityName: string, args: any): Promise<any> {
    if (deviceId !== '${normalizedPackageName}-device-01') {
      throw new Error('Device not found');
    }

    if (capabilityName === 'custom.ping') {
      return {
        ok: true,
        adapter: this.id,
        message: args?.message || 'pong',
        timestamp: Date.now()
      };
    }

    throw new Error('Capability not supported');
  }
}
`;
    const readme = `# @oahl/${normalizedPackageName}

Generated with \`oahl create-adapter\`.

## Development

- Build: \`npm run build\`
- Install into a node workspace: \`oahl install @oahl/${normalizedPackageName}\`
`;
    fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(path.join(targetDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
    fs.writeFileSync(path.join(srcDir, 'index.ts'), adapterSource);
    fs.writeFileSync(path.join(targetDir, 'README.md'), readme);
    console.log(`✅ Adapter scaffold created at ${targetDir}`);
    console.log('Next steps:');
    console.log(`1. cd ${path.relative(process.cwd(), targetDir) || '.'}`);
    console.log('2. npm install');
    console.log('3. npm run build');
    console.log(`4. oahl install @oahl/${normalizedPackageName}`);
});
program
    .command('conformance')
    .description('Run OAHL core conformance checks')
    .option('--workspace <path>', 'Path to OAHL workspace root', process.cwd())
    .action((options) => {
    const workspaceRoot = path.resolve(process.cwd(), options.workspace);
    console.log(`🧪 Running OAHL conformance checks from: ${workspaceRoot}`);
    try {
        (0, child_process_1.execSync)('npm run test:conformance --workspace=@oahl/core', {
            stdio: 'inherit',
            cwd: workspaceRoot
        });
        console.log('\n✅ Conformance checks passed.');
    }
    catch (err) {
        console.error(`\n❌ Conformance checks failed: ${err.message}`);
        process.exit(1);
    }
});
program
    .command('start')
    .description('Start the local OAHL node daemon')
    .option('-p, --port <number>', 'Port to run the server on', '3000')
    .option('-c, --config <path>', 'Path to oahl-config.json', './oahl-config.json')
    .action(async (options) => {
    console.log('🚀 Starting OAHL Node...');
    // Check if config exists
    const configPath = path.resolve(process.cwd(), options.config);
    if (!fs.existsSync(configPath)) {
        console.error(`❌ Error: Configuration file not found at ${configPath}`);
        console.log('Hint: Run "oahl init" to create one.');
        process.exit(1);
    }
    // Pass environment variables to the server process
    process.env.PORT = options.port;
    try {
        const serverPath = path.resolve(__dirname, '../../server/dist/index.js');
        if (fs.existsSync(serverPath)) {
            require(serverPath);
        }
        else {
            const altPath = path.resolve(process.cwd(), 'node_modules/@oahl/server/dist/index.js');
            if (fs.existsSync(altPath)) {
                require(altPath);
            }
            else {
                console.error('❌ Error: Server build not found. Please run "npm run build" first.');
            }
        }
    }
    catch (err) {
        console.error(`❌ Failed to start server: ${err.message}`);
    }
});
program.parse();
