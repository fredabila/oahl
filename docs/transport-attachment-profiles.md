# OAHL Transport & Attachment Profiles (Draft)

This document defines standard attachment/transport profiles so different hardware can connect through one OAHL system contract.

Implementation details for reusable transport plugins are defined in `docs/transport-plugin-architecture.md`.

## 1. Goal

Allow any adapter to declare how the physical device is attached, discovered, authenticated, and controlled in a uniform shape.

## 2. Supported Profile Families

### 2.1 Local Physical

- USB (`usb`)
- Serial/UART (`serial`)
- PCIe (`pcie`)
- GPIO (`gpio`)
- I2C (`i2c`)
- SPI (`spi`)

### 2.2 Local Wireless

- Bluetooth Low Energy (`ble`)
- Wi‑Fi Direct (`wifi_direct`)

### 2.3 Network

- TCP (`tcp`)
- UDP (`udp`)
- HTTP/HTTPS (`http`, `https`)
- WebSocket (`ws`, `wss`)
- MQTT (`mqtt`, `mqtts`)
- CoAP (`coap`)
- RTSP (`rtsp`)
- gRPC (`grpc`)

### 2.4 Real-time Relay

- WebRTC (`webrtc`)

## 3. Standard Attachment Descriptor

Attachment descriptors SHOULD conform to `oahl-attachment-profile.schema.json`.

Core fields:

- `protocol`
- `mode` (`local`, `lan`, `wan`, `relay`)
- `endpoint` (when applicable)
- `auth` (token/cert/pairing mode)
- `security` (tls/pinning/encryption)
- `metadata` (driver version, pairing info, channel)

## 4. Android Example (No Cable)

Android adapters can use a profile sequence:

1. Bootstrap over USB ADB (pairing/setup)
2. Switch to `tcp`/`tls` or ADB-over-Wi‑Fi profile
3. Maintain heartbeats and reconnect logic
4. Keep capability contracts unchanged

The adapter’s transport profile changes; capability APIs remain stable.

## 5. Robotic Arm Example

A robotic arm on industrial LAN can use:

- `protocol: mqtts`
- `mode: lan`
- `endpoint: mqtts://robot-gateway.local:8883`
- `auth: mutual TLS`

Execution response must still follow the OAHL execution-result envelope.

## 6. Adapter Requirements

Adapters should:

- expose one or more attachment descriptors per device
- validate transport readiness in `healthCheck`
- fail with structured errors when transport is unavailable
- never leak credentials in execution payloads

## 7. Future Extension

Add standardized attestation profile:

- node identity document
- signed transport claims
- hardware trust level metadata
