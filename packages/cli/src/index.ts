#!/usr/bin/env node
import { Command } from 'commander';
import prompts from 'prompts';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const program = new Command();

program
  .name('oahl')
  .description('CLI to manage Open Agent Hardware Layer (OAHL) nodes and configs')
  .version('0.1.0');

type AccessVisibility = 'public' | 'shared' | 'private';

interface AccessPolicy {
  visibility?: AccessVisibility;
  allowed_agents?: string[];
  allowed_orgs?: string[];
  denied_agents?: string[];
}

interface DeviceConfig {
  id: string;
  type: string;
  adapter?: string;
  capabilities?: string[];
  owner_id?: string;
  access_policy?: AccessPolicy;
  policy?: {
    public?: boolean;
    max_session_minutes?: number;
  };
  [key: string]: any;
}

interface OahlConfig {
  node_id: string;
  cloud_url?: string;
  provider_api_key?: string;
  owner_id?: string;
  provider?: {
    name?: string;
    owner_id?: string;
    [key: string]: any;
  };
  plugins: string[];
  devices: DeviceConfig[];
  [key: string]: any;
}

interface PortScanRecord {
  portType: 'usb' | 'serial';
  id: string;
  name: string;
  status?: string;
  vendor?: string;
  product?: string;
  className?: string;
}

function resolveAdapterClassFromModule(imported: any): any {
  if (!imported) return undefined;
  if (typeof imported === 'function') return imported;
  if (typeof imported.default === 'function') return imported.default;
  const candidates = Object.values(imported).filter((value: any) => typeof value === 'function');
  return candidates.length > 0 ? candidates[0] : undefined;
}

function createDefaultConfig(): OahlConfig {
  return {
    node_id: 'local-node-01',
    cloud_url: 'https://oahl.onrender.com',
    provider_api_key: '123456',
    provider: {
      name: 'Local Lab'
    },
    plugins: ['@oahl/adapter-mock'],
    devices: []
  };
}

function loadConfig(configPath: string): OahlConfig {
  if (!fs.existsSync(configPath)) {
    return createDefaultConfig();
  }

  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return {
    ...createDefaultConfig(),
    ...raw,
    provider: {
      ...createDefaultConfig().provider,
      ...(raw.provider || {})
    },
    plugins: Array.isArray(raw.plugins) ? raw.plugins : [],
    devices: Array.isArray(raw.devices) ? raw.devices : []
  };
}

function saveConfig(configPath: string, config: OahlConfig) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function toCsv(values?: string[]): string {
  return Array.isArray(values) ? values.join(', ') : '';
}

function safeExec(command: string): string {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

function scanUsbDevices(): PortScanRecord[] {
  if (process.platform === 'win32') {
    const raw = safeExec('powershell -NoProfile -Command "Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -like \"USB*\" } | Select-Object FriendlyName,Class,Status,InstanceId,Manufacturer | ConvertTo-Json -Depth 4"');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      return rows.map((row: any) => ({
        portType: 'usb',
        id: String(row.InstanceId || row.FriendlyName || 'usb-device'),
        name: String(row.FriendlyName || row.InstanceId || 'USB Device'),
        status: String(row.Status || ''),
        vendor: String(row.Manufacturer || ''),
        className: String(row.Class || '')
      }));
    } catch {
      return [];
    }
  }

  if (process.platform === 'darwin') {
    const raw = safeExec('system_profiler SPUSBDataType -json');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      const root = parsed?.SPUSBDataType;
      const results: PortScanRecord[] = [];

      const walk = (nodes: any[]) => {
        for (const node of nodes || []) {
          if (node?._name) {
            results.push({
              portType: 'usb',
              id: String(node?.serial_num || node?._name),
              name: String(node?._name),
              vendor: String(node?.manufacturer || ''),
              product: String(node?.product_id || ''),
              status: 'present'
            });
          }
          if (Array.isArray(node?._items)) {
            walk(node._items);
          }
        }
      };

      walk(Array.isArray(root) ? root : []);
      return results;
    } catch {
      return [];
    }
  }

  const raw = safeExec('lsusb');
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      portType: 'usb' as const,
      id: line,
      name: line,
      status: 'present'
    }));
}

function scanSerialPorts(): PortScanRecord[] {
  if (process.platform === 'win32') {
    const rawPorts = safeExec('powershell -NoProfile -Command "[System.IO.Ports.SerialPort]::GetPortNames() | ConvertTo-Json"');
    if (!rawPorts) return [];
    try {
      const parsed = JSON.parse(rawPorts);
      const ports = Array.isArray(parsed) ? parsed : [parsed];
      return ports
        .map((port: any) => String(port || '').trim())
        .filter(Boolean)
        .map((port: string) => ({
          portType: 'serial' as const,
          id: port,
          name: `Serial Port ${port}`,
          status: 'present'
        }));
    } catch {
      return [];
    }
  }

  if (process.platform === 'darwin') {
    const raw = safeExec('ls /dev/tty.* /dev/cu.* 2>/dev/null');
    if (!raw) return [];
    return raw
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((port) => ({
        portType: 'serial' as const,
        id: port,
        name: port,
        status: 'present'
      }));
  }

  const raw = safeExec('sh -lc "ls /dev/ttyUSB* /dev/ttyACM* 2>/dev/null"');
  if (!raw) return [];
  return raw
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((port) => ({
      portType: 'serial' as const,
      id: port,
      name: port,
      status: 'present'
    }));
}

function classifySuggestedAdapter(device: PortScanRecord): { adapter: string; type: string; capabilityHints: string[] } {
  const haystack = `${device.name} ${device.vendor || ''} ${device.className || ''}`.toLowerCase();

  if (haystack.includes('android') || haystack.includes('adb')) {
    return { adapter: '@oahl/adapter-android', type: 'mobile', capabilityHints: ['system.info', 'screen.screenshot', 'system.shell'] };
  }
  if (haystack.includes('camera') || haystack.includes('video') || haystack.includes('webcam')) {
    return { adapter: '@oahl/adapter-usb-camera', type: 'camera', capabilityHints: ['camera.capture'] };
  }
  if (haystack.includes('rtl') || haystack.includes('sdr') || haystack.includes('radio')) {
    return { adapter: '@oahl/adapter-rtl-sdr', type: 'sdr', capabilityHints: ['tune', 'read_samples'] };
  }
  if (device.portType === 'serial') {
    return { adapter: '@oahl/adapter-custom', type: 'serial-device', capabilityHints: ['device.read', 'device.write'] };
  }
  return { adapter: '@oahl/adapter-custom', type: 'custom', capabilityHints: ['hardware.baseline'] };
}

async function editNodeSettings(config: OahlConfig) {
  const response = await prompts([
    {
      type: 'text',
      name: 'node_id',
      message: 'Node ID',
      initial: config.node_id || 'local-node-01'
    },
    {
      type: 'text',
      name: 'provider_name',
      message: 'Provider name',
      initial: config.provider?.name || 'Local Lab'
    },
    {
      type: 'text',
      name: 'owner_id',
      message: 'Owner ID (optional)',
      initial: config.owner_id || config.provider?.owner_id || ''
    },
    {
      type: 'text',
      name: 'cloud_url',
      message: 'Cloud URL',
      initial: config.cloud_url || 'https://oahl.onrender.com'
    },
    {
      type: 'password',
      name: 'provider_api_key',
      message: 'Provider API key',
      initial: config.provider_api_key || '123456'
    }
  ]);

  config.node_id = response.node_id || config.node_id;
  config.provider = config.provider || {};
  config.provider.name = response.provider_name || config.provider.name;
  config.cloud_url = response.cloud_url || config.cloud_url;
  config.provider_api_key = response.provider_api_key || config.provider_api_key;

  const ownerId = (response.owner_id || '').trim();
  if (ownerId) {
    config.owner_id = ownerId;
    config.provider.owner_id = ownerId;
  } else {
    delete config.owner_id;
    if (config.provider) delete config.provider.owner_id;
  }
}

async function managePlugins(config: OahlConfig) {
  while (true) {
    const choice = await prompts({
      type: 'select',
      name: 'action',
      message: `Plugins (${config.plugins.length})`,
      choices: [
        { title: 'Add plugin', value: 'add' },
        { title: 'Remove plugin', value: 'remove' },
        { title: 'Back', value: 'back' }
      ]
    });

    if (!choice.action || choice.action === 'back') return;

    if (choice.action === 'add') {
      const addRes = await prompts({
        type: 'text',
        name: 'plugin',
        message: 'Plugin package name (e.g. @oahl/adapter-usb-camera)'
      });
      const plugin = (addRes.plugin || '').trim();
      if (plugin && !config.plugins.includes(plugin)) {
        config.plugins.push(plugin);
      }
    }

    if (choice.action === 'remove') {
      if (config.plugins.length === 0) continue;
      const removeRes = await prompts({
        type: 'select',
        name: 'plugin',
        message: 'Select plugin to remove',
        choices: config.plugins.map((plugin) => ({ title: plugin, value: plugin }))
      });
      if (removeRes.plugin) {
        config.plugins = config.plugins.filter((plugin) => plugin !== removeRes.plugin);
      }
    }
  }
}

async function promptDevice(existing?: DeviceConfig): Promise<DeviceConfig | undefined> {
  const initialVisibility = existing?.access_policy?.visibility || (existing?.policy?.public ? 'public' : 'private');
  const response = await prompts([
    {
      type: 'text',
      name: 'id',
      message: 'Device ID',
      initial: existing?.id || 'device-01'
    },
    {
      type: 'text',
      name: 'type',
      message: 'Device type',
      initial: existing?.type || 'custom'
    },
    {
      type: 'text',
      name: 'adapter',
      message: 'Adapter name',
      initial: existing?.adapter || 'mock'
    },
    {
      type: 'text',
      name: 'capabilities',
      message: 'Capabilities (comma-separated)',
      initial: toCsv(existing?.capabilities)
    },
    {
      type: 'text',
      name: 'owner_id',
      message: 'Owner ID (optional)',
      initial: existing?.owner_id || ''
    },
    {
      type: 'select',
      name: 'visibility',
      message: 'Access visibility',
      choices: [
        { title: 'Public', value: 'public' },
        { title: 'Shared (allow-list)', value: 'shared' },
        { title: 'Private (owner/allow-list only)', value: 'private' }
      ],
      initial: ['public', 'shared', 'private'].indexOf(initialVisibility)
    },
    {
      type: 'text',
      name: 'allowed_agents',
      message: 'Allowed agent IDs (comma-separated)',
      initial: toCsv(existing?.access_policy?.allowed_agents)
    },
    {
      type: 'text',
      name: 'allowed_orgs',
      message: 'Allowed org IDs (comma-separated)',
      initial: toCsv(existing?.access_policy?.allowed_orgs)
    },
    {
      type: 'text',
      name: 'denied_agents',
      message: 'Denied agent IDs (comma-separated)',
      initial: toCsv(existing?.access_policy?.denied_agents)
    },
    {
      type: 'number',
      name: 'max_session_minutes',
      message: 'Max session minutes',
      initial: existing?.policy?.max_session_minutes || 30,
      min: 1
    }
  ]);

  const id = (response.id || '').trim();
  if (!id) {
    return undefined;
  }

  const visibility = (response.visibility || 'public') as AccessVisibility;
  const parsedOwnerId = (response.owner_id || '').trim();

  return {
    id,
    type: (response.type || 'custom').trim(),
    adapter: (response.adapter || 'mock').trim(),
    capabilities: parseCsv(response.capabilities || ''),
    ...(parsedOwnerId ? { owner_id: parsedOwnerId } : {}),
    access_policy: {
      visibility,
      allowed_agents: parseCsv(response.allowed_agents || ''),
      allowed_orgs: parseCsv(response.allowed_orgs || ''),
      denied_agents: parseCsv(response.denied_agents || '')
    },
    policy: {
      public: visibility === 'public',
      max_session_minutes: Number(response.max_session_minutes) || 30
    }
  };
}

async function manageDevices(config: OahlConfig) {
  while (true) {
    const choice = await prompts({
      type: 'select',
      name: 'action',
      message: `Devices (${config.devices.length})`,
      choices: [
        { title: 'Add device', value: 'add' },
        { title: 'Edit device', value: 'edit' },
        { title: 'Remove device', value: 'remove' },
        { title: 'Back', value: 'back' }
      ]
    });

    if (!choice.action || choice.action === 'back') return;

    if (choice.action === 'add') {
      const device = await promptDevice();
      if (device) {
        config.devices.push(device);
      }
    }

    if (choice.action === 'edit') {
      if (config.devices.length === 0) continue;
      const select = await prompts({
        type: 'select',
        name: 'deviceId',
        message: 'Select device to edit',
        choices: config.devices.map((device) => ({
          title: `${device.id} (${device.type})`,
          value: device.id
        }))
      });

      if (!select.deviceId) continue;
      const index = config.devices.findIndex((device) => device.id === select.deviceId);
      if (index < 0) continue;

      const updated = await promptDevice(config.devices[index]);
      if (updated) {
        config.devices[index] = updated;
      }
    }

    if (choice.action === 'remove') {
      if (config.devices.length === 0) continue;
      const select = await prompts({
        type: 'select',
        name: 'deviceId',
        message: 'Select device to remove',
        choices: config.devices.map((device) => ({
          title: `${device.id} (${device.type})`,
          value: device.id
        }))
      });
      if (select.deviceId) {
        config.devices = config.devices.filter((device) => device.id !== select.deviceId);
      }
    }
  }
}

async function importDetectedDevices(config: OahlConfig) {
  const detectedDevices: DeviceConfig[] = [];

  for (const pluginName of config.plugins || []) {
    try {
      let imported: any;
      try {
        imported = require(pluginName);
      } catch {
        const localPath = path.resolve(process.cwd(), 'node_modules', pluginName);
        imported = require(localPath);
      }

      const AdapterClass = resolveAdapterClassFromModule(imported);
      if (typeof AdapterClass !== 'function') {
        console.log(`⚠️ Skipped ${pluginName}: no constructable adapter export.`);
        continue;
      }

      const adapter = new AdapterClass();
      if (typeof adapter.initialize === 'function') {
        try {
          await adapter.initialize();
        } catch (err: any) {
          console.log(`⚠️ ${pluginName} initialize warning: ${err.message}`);
        }
      }

      const adapterDevices = (await adapter.getDevices?.()) || [];
      for (const device of adapterDevices) {
        let capabilityNames: string[] = [];
        try {
          const capabilities = (await adapter.getCapabilities?.(device.id)) || [];
          capabilityNames = capabilities.map((cap: any) => typeof cap === 'string' ? cap : cap?.name).filter(Boolean);
        } catch (err: any) {
          console.log(`⚠️ Failed to get capabilities for ${device.id}: ${err.message}`);
        }

        detectedDevices.push({
          id: device.id,
          type: device.type || 'custom',
          adapter: device.adapter || (adapter.id || pluginName),
          capabilities: capabilityNames,
          policy: {
            public: device.isPublic !== false,
            max_session_minutes: 30
          }
        });
      }
    } catch (err: any) {
      console.log(`⚠️ Failed to inspect plugin ${pluginName}: ${err.message}`);
    }
  }

  let added = 0;
  let updated = 0;
  for (const detected of detectedDevices) {
    const existingIndex = config.devices.findIndex((device) => device.id === detected.id);
    if (existingIndex >= 0) {
      const existing = config.devices[existingIndex];
      config.devices[existingIndex] = {
        ...detected,
        ...existing,
        id: detected.id,
        type: detected.type,
        adapter: detected.adapter,
        capabilities: detected.capabilities
      };
      updated += 1;
    } else {
      config.devices.push(detected);
      added += 1;
    }
  }

  console.log(`🔎 Device import complete: ${detectedDevices.length} detected, ${added} added, ${updated} updated.`);
}

async function runTui(configPath: string) {
  const config = loadConfig(configPath);
  let dirty = false;

  while (true) {
    const summary = `Node: ${config.node_id} | Plugins: ${config.plugins.length} | Devices: ${config.devices.length}`;
    const choice = await prompts({
      type: 'select',
      name: 'action',
      message: `OAHL Config TUI (${summary})`,
      choices: [
        { title: 'Edit node settings', value: 'node' },
        { title: 'Manage plugins', value: 'plugins' },
        { title: 'Manage devices + access policies', value: 'devices' },
        { title: 'Import detected devices from plugins', value: 'import-devices' },
        { title: 'Save', value: 'save' },
        { title: 'Save and exit', value: 'save-exit' },
        { title: 'Exit without saving', value: 'exit' }
      ]
    });

    if (!choice.action) return;

    if (choice.action === 'node') {
      await editNodeSettings(config);
      dirty = true;
    }

    if (choice.action === 'plugins') {
      await managePlugins(config);
      dirty = true;
    }

    if (choice.action === 'devices') {
      await manageDevices(config);
      dirty = true;
    }

    if (choice.action === 'import-devices') {
      await importDetectedDevices(config);
      dirty = true;
    }

    if (choice.action === 'save') {
      saveConfig(configPath, config);
      dirty = false;
      console.log(`✅ Saved config to ${configPath}`);
    }

    if (choice.action === 'save-exit') {
      saveConfig(configPath, config);
      console.log(`✅ Saved config to ${configPath}`);
      return;
    }

    if (choice.action === 'exit') {
      if (dirty) {
        const confirm = await prompts({
          type: 'confirm',
          name: 'discard',
          message: 'Discard unsaved changes?',
          initial: false
        });
        if (!confirm.discard) {
          continue;
        }
      }
      return;
    }
  }
}

async function ensureProviderAuth(): Promise<{ email: string; pin: string } | undefined> {
  const sessionPath = path.resolve(process.cwd(), '.oahl-session.json');
  
  if (fs.existsSync(sessionPath)) {
    try {
      const session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
      if (session.email && session.pin) {
        return session;
      }
    } catch {
      // Ignore corrupted session
    }
  }

  console.log('🔐 Provider Authentication Required');
  console.log('Enter your Developer Portal credentials to link this node to your account.\n');

  const response = await prompts([
    {
      type: 'text',
      name: 'email',
      message: 'Email Address',
      validate: (value: string) => value.includes('@') || 'Please enter a valid email'
    },
    {
      type: 'password',
      name: 'pin',
      message: '6-Digit PIN',
      validate: (value: string) => /^\d{6}$/.test(value) || 'PIN must be exactly 6 digits'
    },
    {
      type: 'confirm',
      name: 'save',
      message: 'Remember these credentials on this machine?',
      initial: true
    }
  ]);

  if (!response.email || !response.pin) {
    return undefined;
  }

  const credentials = { email: response.email, pin: response.pin };

  if (response.save) {
    fs.writeFileSync(sessionPath, JSON.stringify(credentials, null, 2));
    console.log(`✅ Credentials saved to ${sessionPath}\n`);
  }

  return credentials;
}

program
  .command('login')
  .description('Link this machine to your OAHL Developer Portal account')
  .action(async () => {
    const auth = await ensureProviderAuth();
    if (auth) {
      console.log(`✨ Successfully logged in as ${auth.email}`);
    } else {
      console.log('❌ Login cancelled.');
    }
  });

program
  .command('logout')
  .description('Remove saved credentials from this machine')
  .action(() => {
    const sessionPath = path.resolve(process.cwd(), '.oahl-session.json');
    if (fs.existsSync(sessionPath)) {
      fs.unlinkSync(sessionPath);
      console.log('👋 Logged out. Credentials removed.');
    } else {
      console.log('ℹ️ No active session found.');
    }
  });

program
  .command('init')
  .description('Interactively create a new oahl-config.json file for your hardware node')
  .action(async () => {
    console.log('🤖 Welcome to the OAHL Node Setup Wizard!\n');

    // Check for auth early
    const auth = await ensureProviderAuth();
    if (!auth) {
      console.log('❌ Auth required to initialize node.');
      process.exit(1);
    }

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
      cloud_url: "https://oahl.onrender.com",
      provider_api_key: "123456",
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
      let capabilities: string[] = [];
      let localPath = '';

      if (response.deviceType === 'camera') {
         adapter = 'usb-camera';
         capabilities = ['camera.capture', 'camera.stream'];
         localPath = '/dev/video0';
         config.plugins.push("@oahl/adapter-usb-camera");
      } else if (response.deviceType === 'radio') {
         adapter = 'rtl-sdr';
         capabilities = ['radio.scan', 'radio.measure_power'];
         config.plugins.push("@oahl/adapter-rtl-sdr");
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
    console.log(`2. Start the local node using:`);
    console.log(`   oahl start\n`);
  });

program
  .command('install <adapter>')
  .description('Install a new hardware adapter plugin')
  .action((adapter) => {
    console.log(`📦 Installing adapter: ${adapter}...`);
    try {
      execSync(`npm install ${adapter}`, { stdio: 'inherit' });
      
      // Add to config if exists
      const configPath = path.resolve(process.cwd(), 'oahl-config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (!config.plugins) config.plugins = [];
        if (!config.plugins.includes(adapter)) {
          config.plugins.push(adapter);
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
          console.log(`✅ Added ${adapter} to oahl-config.json plugins list.`);
        }
      }
      console.log(`\n✨ Successfully installed ${adapter}. Restart your node to enable it.`);
    } catch (err: any) {
      console.error(`\n❌ Failed to install adapter: ${err.message}`);
    }
  });

program
  .command('remove <adapter>')
  .description('Remove a hardware adapter plugin')
  .action((adapter) => {
    console.log(`🗑️ Removing adapter: ${adapter}...`);
    try {
      execSync(`npm uninstall ${adapter}`, { stdio: 'inherit' });
      
      const configPath = path.resolve(process.cwd(), 'oahl-config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.plugins) {
          config.plugins = config.plugins.filter((p: string) => p !== adapter);
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
          console.log(`✅ Removed ${adapter} from oahl-config.json plugins list.`);
        }
      }
      console.log(`\n✨ Successfully removed ${adapter}.`);
    } catch (err: any) {
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
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
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
  .command('scan-ports')
  .description('Scan connected USB/serial devices and print adapter creation guidance')
  .option('--json', 'Output scan results as JSON', false)
  .action((options) => {
    console.log('🔎 Scanning connected ports/devices...');

    const usb = scanUsbDevices();
    const serial = scanSerialPorts();
    const all = [...usb, ...serial];

    if (options.json) {
      console.log(JSON.stringify({ timestamp: Date.now(), devices: all }, null, 2));
      return;
    }

    if (all.length === 0) {
      console.log('⚠️ No USB/serial devices detected.');
      console.log('Tip: reconnect the device and run `oahl scan-ports` again.');
      return;
    }

    console.log(`✅ Detected ${all.length} device(s):\n`);

    all.forEach((device, index) => {
      const suggestion = classifySuggestedAdapter(device);
      const suggestedId = `detected-${index + 1}`;

      console.log(`${index + 1}. [${device.portType.toUpperCase()}] ${device.name}`);
      console.log(`   id: ${device.id}`);
      if (device.status) console.log(`   status: ${device.status}`);
      if (device.vendor) console.log(`   vendor: ${device.vendor}`);
      if (device.className) console.log(`   class: ${device.className}`);
      console.log(`   suggested adapter: ${suggestion.adapter}`);
      console.log(`   suggested type: ${suggestion.type}`);
      console.log(`   capability hints: ${suggestion.capabilityHints.join(', ')}`);
      console.log('   config snippet:');
      console.log(`   {"id":"${suggestedId}","type":"${suggestion.type}","adapter":"${suggestion.adapter.replace('@oahl/adapter-', '')}","capabilities":[${suggestion.capabilityHints.map((cap) => `"${cap}"`).join(',')}]}`);
      console.log('');
    });

    console.log('🧭 Adapter creation flow:');
    console.log('1) Use existing suggested adapter where possible.');
    console.log('2) For unknown hardware, scaffold one: oahl create-adapter <name>.');
    console.log('3) Add hardware.baseline capability for fallback intent handling.');
    console.log('4) Install plugin: oahl install @oahl/adapter-<name>.');
    console.log('5) Import devices in TUI: oahl tui -> Import detected devices.');
  });

program
  .command('conformance')
  .description('Run OAHL core conformance checks')
  .option('--workspace <path>', 'Path to OAHL workspace root', process.cwd())
  .action((options) => {
    const workspaceRoot = path.resolve(process.cwd(), options.workspace);
    console.log(`🧪 Running OAHL conformance checks from: ${workspaceRoot}`);

    try {
      execSync('npm run test:conformance --workspace=@oahl/core', {
        stdio: 'inherit',
        cwd: workspaceRoot
      });
      console.log('\n✅ Conformance checks passed.');
    } catch (err: any) {
      console.error(`\n❌ Conformance checks failed: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('tui')
  .description('Open terminal UI to configure OAHL node, plugins, devices, and access policies')
  .option('-c, --config <path>', 'Path to oahl-config.json', './oahl-config.json')
  .action(async (options) => {
    const configPath = path.resolve(process.cwd(), options.config);
    console.log(`🖥️ Opening OAHL TUI for ${configPath}`);
    try {
      await runTui(configPath);
      console.log('✅ Closed OAHL TUI');
    } catch (err: any) {
      console.error(`❌ TUI failed: ${err.message}`);
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
    
    // Check for auth
    const auth = await ensureProviderAuth();
    if (!auth) {
      console.error('❌ Error: Authentication required to start node.');
      process.exit(1);
    }

    // Check if config exists
    const configPath = path.resolve(process.cwd(), options.config);
    if (!fs.existsSync(configPath)) {
      console.error(`❌ Error: Configuration file not found at ${configPath}`);
      console.log('Hint: Run "oahl init" to create one.');
      process.exit(1);
    }

    // Pass environment variables to the server process
    process.env.PORT = options.port;
    process.env.OAHL_OWNER_EMAIL = auth.email;
    process.env.OAHL_OWNER_PIN = auth.pin;
    
    try {
      const serverPath = path.resolve(__dirname, '../../server/dist/index.js');
      if (fs.existsSync(serverPath)) {
        require(serverPath);
      } else {
        const altPath = path.resolve(process.cwd(), 'node_modules/@oahl/server/dist/index.js');
        if (fs.existsSync(altPath)) {
            require(altPath);
        } else {
            console.error('❌ Error: Server build not found. Please run "npm run build" first.');
        }
      }
    } catch (err: any) {
      console.error(`❌ Failed to start server: ${err.message}`);
    }
  });

program.parse();
