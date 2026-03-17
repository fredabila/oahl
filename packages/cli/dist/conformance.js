"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAdapterConformance = runAdapterConformance;
const path_1 = __importDefault(require("path"));
function logPass(msg) {
    console.log(`  ✅ ${msg}`);
}
function logFail(msg) {
    console.log(`  ❌ ${msg}`);
}
async function runAdapterConformance(adapterPath) {
    let AdapterClass;
    let adapter;
    let allPassed = true;
    console.log(`\n🧪 OAHL Adapter Conformance Suite`);
    console.log(`=================================`);
    console.log(`Target: ${adapterPath}\n`);
    // Target 1: Module Loading & Interface
    console.log(`1. Module Loading & Interface Implementation`);
    try {
        const fullPath = path_1.default.resolve(process.cwd(), adapterPath);
        let imported = require(fullPath);
        if (imported.default && typeof imported.default === 'function') {
            AdapterClass = imported.default;
        }
        else if (typeof imported === 'function') {
            AdapterClass = imported;
        }
        else {
            const exports = Object.values(imported).filter(v => typeof v === 'function');
            if (exports.length > 0)
                AdapterClass = exports[0];
        }
        if (!AdapterClass) {
            throw new Error('Could not find a constructable class export.');
        }
        adapter = new AdapterClass();
        if (typeof adapter.getDevices !== 'function' || typeof adapter.execute !== 'function') {
            throw new Error('Missing required methods from Adapter interface (getDevices, execute).');
        }
        logPass('Adapter class instantiated and implements required core interface.');
    }
    catch (err) {
        logFail(`Failed to load or instantiate adapter: ${err.message}`);
        return false; // Fatal, cannot continue tests
    }
    // Initialize
    try {
        if (typeof adapter.initialize === 'function') {
            await adapter.initialize();
        }
    }
    catch (err) {
        logFail(`adapter.initialize() threw an error: ${err.message}`);
        allPassed = false;
    }
    let devices = [];
    // Target 2: Device Discovery
    console.log(`\n2. Device Discovery (getDevices)`);
    try {
        devices = await adapter.getDevices();
        if (!Array.isArray(devices)) {
            throw new Error('getDevices() did not return an array.');
        }
        if (devices.length === 0) {
            console.log(`  ⚠️ Adapter returned 0 devices. Subsequent tests will be limited.`);
        }
        else {
            for (const d of devices) {
                if (!d.id || typeof d.id !== 'string')
                    throw new Error('Device missing string "id".');
                if (!d.type || typeof d.type !== 'string')
                    throw new Error(`Device ${d.id} missing string "type".`);
            }
            logPass(`Returned ${devices.length} properly-formatted devices.`);
        }
    }
    catch (err) {
        logFail(`Device discovery failed: ${err.message}`);
        allPassed = false;
    }
    // Target 3: Capability Descriptors
    console.log(`\n3. Capability Descriptors (getCapabilities)`);
    let testedCapabilities = 0;
    let capabilityNameForExecuteRaw = null;
    let deviceIdForExecute = null;
    for (const device of devices) {
        try {
            if (typeof adapter.getCapabilities !== 'function') {
                throw new Error('Adapter missing getCapabilities method.');
            }
            const caps = await adapter.getCapabilities(device.id);
            if (!Array.isArray(caps))
                throw new Error(`getCapabilities for ${device.id} did not return an array.`);
            for (const cap of caps) {
                testedCapabilities++;
                if (!cap.name || typeof cap.name !== 'string')
                    throw new Error('Capability missing string "name".');
                if (!cap.name.match(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)(\.[a-z0-9_]+)*$/)) {
                    throw new Error(`Capability name "${cap.name}" violates dot-notation format requirements.`);
                }
                if (!cap.schema || typeof cap.schema !== 'object') {
                    throw new Error(`Capability "${cap.name}" missing JSON "schema" definition.`);
                }
                // Save one for execution envelope testing
                if (!capabilityNameForExecuteRaw) {
                    capabilityNameForExecuteRaw = cap.name;
                    deviceIdForExecute = device.id;
                }
            }
        }
        catch (err) {
            logFail(`Capability validation failed on device ${device.id}: ${err.message}`);
            allPassed = false;
        }
    }
    if (devices.length > 0 && testedCapabilities > 0) {
        logPass(`All ${testedCapabilities} declared capabilities meet schema and naming conformance.`);
    }
    else if (devices.length > 0) {
        logFail(`Devices found, but 0 capabilities declared.`);
        allPassed = false;
    }
    // Target 4: Execution Envelope Structure
    console.log(`\n4. Execution Envelope Structure (execute)`);
    if (!deviceIdForExecute || !capabilityNameForExecuteRaw) {
        console.log(`  ⏭️ Skipped (No capabilities discovered to test against)`);
    }
    else {
        try {
            // Simulate an execution (note: we expect it to fail gracefully if params are missing)
            const result = await adapter.execute(deviceIdForExecute, capabilityNameForExecuteRaw, {});
            // Standard structure checks from protocol spec
            if (!result.schema_version)
                throw new Error("Missing 'schema_version' in result envelope.");
            if (!result.operation_id)
                throw new Error("Missing 'operation_id' in result envelope.");
            if (!['success', 'error'].includes(result.status))
                throw new Error(`Invalid status: ${result.status}`);
            if (!result.completion || typeof result.completion.done !== 'boolean')
                throw new Error("Missing 'completion.done' boolean.");
            if (result.status === 'error' && (!result.error || !result.error.code))
                throw new Error("Status is error but missing 'error.code' object.");
            logPass(`Execution envelope structure meets OAHL Protocol v1 requirements.`);
        }
        catch (err) {
            if (err.message.includes("schema_version") || err.message.includes("envelope") || err.message.includes("completion")) {
                logFail(`Execution payload validation block failed: ${err.message}`);
                allPassed = false;
            }
            else {
                // If the adapter throws a regular Error object, that implies it is not wrapping it in the canonical envelope.
                logFail(`Adapter threw an uncaught error instead of returning a canonical envelope: ${err.message}`);
                allPassed = false;
            }
        }
    }
    console.log(`\n=================================`);
    if (allPassed) {
        console.log(`🏆 CONFORMANCE PASSED: Adapter meets OAHL ecosystem standards.\n`);
        return true;
    }
    else {
        console.log(`❌ CONFORMANCE FAILED: Core specification gaps found.\n`);
        return false;
    }
}
