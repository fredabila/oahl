#!/usr/bin/env node
import { Command } from 'commander';
import prompts from 'prompts';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('oahl')
  .description('CLI to manage Open Agent Hardware Layer (OAHL) nodes and configs')
  .version('0.1.0');

program
  .command('init')
  .description('Interactively create a new oahl-config.json file for your hardware node')
  .action(async () => {
    console.log('🤖 Welcome to the OAHL Node Setup Wizard!\n');

    const response = await prompts([
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

    const config: any = {
      node_id: response.nodeId,
      provider: {
        name: response.providerName
      },
      devices: []
    };

    if (response.deviceType !== 'none') {
      let adapter = 'mock';
      let capabilities: string[] = [];
      let localPath = '';

      if (response.deviceType === 'camera') {
         adapter = 'usb-camera';
         capabilities = ['camera.capture', 'camera.stream'];
         localPath = '/dev/video0';
      } else if (response.deviceType === 'radio') {
         adapter = 'rtl-sdr';
         capabilities = ['radio.scan', 'radio.measure_power'];
      } else if (response.deviceType === 'mock') {
         adapter = 'mock-sensor';
         capabilities = ['sensor.read'];
      }

      const deviceRes = await prompts([
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

      const deviceConfig: any = {
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
    console.log(`2. Start the local node using Docker:`);
    console.log(`   docker run -p 8080:8080 -v $(pwd)/oahl-config.json:/app/oahl-config.json oahl/node:latest\n`);
  });

program.parse();
