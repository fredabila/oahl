import {
  BaseTransportProvider,
  TransportAttachmentProfile,
  TransportConnectRequest,
  TransportConnection,
  TransportHealth,
  TransportCommand,
  TransportResult
} from '../transport';

/**
 * BLE Transport Stub — Testing & Development
 *
 * A stub implementation of the TransportProvider interface for Bluetooth Low Energy.
 * This does NOT perform real BLE operations; it simulates connection lifecycle
 * and command execution so adapters targeting BLE devices can be developed
 * and tested without requiring physical BLE hardware.
 *
 * Replace this with a real implementation (e.g., using `noble` or `@abandonware/noble`)
 * when deploying against actual BLE peripherals.
 *
 * Usage:
 *   const ble = new BleTransportStub();
 *   const conn = await ble.connect({ deviceId: 'ble-sensor-01', profile, timeoutMs: 5000 });
 *   const result = await ble.execute(conn, { operationId: 'op-1', capability: 'sensor.read', payload: {} });
 *   await ble.disconnect(conn);
 */
export default class BleTransportStub extends BaseTransportProvider {
  id = 'transport-ble-stub';
  protocols = ['ble' as const];

  private connections = new Map<string, TransportConnection>();
  private simulatedLatencyMs: number;

  constructor(options?: { simulatedLatencyMs?: number }) {
    super();
    this.simulatedLatencyMs = options?.simulatedLatencyMs ?? 50;
  }

  supports(profile: TransportAttachmentProfile): boolean {
    return profile.protocol === 'ble';
  }

  async connect(request: TransportConnectRequest): Promise<TransportConnection> {
    await this.simulateDelay(this.simulatedLatencyMs * 2); // BLE pairing takes longer

    const connection: TransportConnection = {
      connectionId: `ble-conn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      deviceId: request.deviceId,
      protocol: 'ble',
      connectedAt: Date.now(),
      metadata: {
        stub: true,
        rssi: -Math.floor(Math.random() * 40 + 40), // Simulated signal strength -40 to -80 dBm
        mtu: 247,
        profile: request.profile
      }
    };

    this.connections.set(connection.connectionId, connection);
    return connection;
  }

  async disconnect(connection: TransportConnection): Promise<void> {
    await this.simulateDelay(this.simulatedLatencyMs / 2);
    this.connections.delete(connection.connectionId);
  }

  async health(connection: TransportConnection): Promise<TransportHealth> {
    const exists = this.connections.has(connection.connectionId);
    if (!exists) {
      return { status: 'error', message: 'Connection not found (disconnected or expired)' };
    }

    return {
      status: 'ok',
      latencyMs: this.simulatedLatencyMs,
      details: {
        connectedAt: connection.connectedAt,
        uptimeMs: Date.now() - connection.connectedAt,
        rssi: connection.metadata?.rssi ?? -60,
        stub: true
      }
    };
  }

  async execute<TPayload = any, TData = any>(
    connection: TransportConnection,
    command: TransportCommand<TPayload>
  ): Promise<TransportResult<TData>> {
    if (!this.connections.has(connection.connectionId)) {
      return {
        operationId: command.operationId,
        success: false,
        error: {
          code: 'BLE_NOT_CONNECTED',
          message: `No active BLE connection for ${connection.deviceId}`,
          retryable: true
        }
      };
    }

    const start = Date.now();
    await this.simulateDelay(this.simulatedLatencyMs);

    // Simulate responses for common capability patterns
    const stubData = this.generateStubResponse(command.capability, command.payload);

    return {
      operationId: command.operationId,
      success: true,
      data: stubData as TData,
      durationMs: Date.now() - start,
      raw: { stub: true, capability: command.capability }
    };
  }

  private generateStubResponse(capability: string, payload: any): any {
    if (capability.startsWith('sensor.')) {
      return {
        value: Math.random() * 100,
        unit: capability.includes('temp') ? '°C' : capability.includes('humid') ? '%' : 'raw',
        timestamp: new Date().toISOString(),
        source: 'ble-stub'
      };
    }

    if (capability.startsWith('actuator.')) {
      return {
        accepted: true,
        state: payload?.state ?? 'toggled',
        timestamp: new Date().toISOString()
      };
    }

    return {
      status: 'ok',
      stub: true,
      capability,
      timestamp: new Date().toISOString()
    };
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
