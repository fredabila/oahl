# Architecture

OAHL is composed of several key components:

1. **Server (`@oahl/server`):** The main entry point. Provides an HTTP REST API for agents to interact with.
2. **Core (`@oahl/core`):** Contains the domain models (interfaces), the `PolicyEngine`, and the `SessionManager`.
3. **Adapters (`@oahl/adapter-*`):** Hardware-specific plugins that implement the standard `Adapter` interface. They translate OAHL standard commands into hardware-specific protocols.

## Flow of Execution
1. An Agent requests to start a session for a specific `deviceId`.
2. The Server consults the `SessionManager` to ensure the device is available.
3. Once a session is active, the Agent requests an execution of a capability.
4. The Server validates the request against the `PolicyEngine`.
5. If allowed, the Server routes the command to the appropriate `Adapter`.
6. The `Adapter` interacts with the physical hardware and returns the result.
