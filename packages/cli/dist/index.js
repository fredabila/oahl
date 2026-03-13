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
        }
        else if (response.deviceType === 'radio') {
            adapter = 'rtl-sdr';
            capabilities = ['radio.scan', 'radio.measure_power'];
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
        // In the workspace structure, server is in ../../server/dist/index.js relative to this file's dist
        // If we are running from packages/cli/dist/index.js
        const serverPath = path.resolve(__dirname, '../../server/dist/index.js');
        if (fs.existsSync(serverPath)) {
            require(serverPath);
        }
        else {
            // Fallback for different execution environments
            console.error('❌ Error: Server build not found at ' + serverPath);
            console.log('Trying alternative path...');
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
