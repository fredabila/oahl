# OAHL Go SDK

Go client library for the [OAHL](https://github.com/fredabila/oahl) (Open Agent Hardware Layer) protocol.

**Zero dependencies** — uses Go standard library only (`net/http`, `encoding/json`).

## Install

```bash
go get github.com/fredabila/oahl/sdk-go
```

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "log"

    oahl "github.com/fredabila/oahl/sdk-go"
)

func main() {
    ctx := context.Background()
    cloud := oahl.NewCloudClient("https://oahl.onrender.com", "your-agent-key")

    // 1. Discover hardware
    resp, err := cloud.GetCapabilities(ctx, &oahl.CapabilitiesQuery{
        Type: "android",
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Found %d devices\n", len(resp.Devices))

    // 2. Reserve a session
    sess, err := cloud.RequestSession(ctx, oahl.SessionRequest{
        DeviceID: resp.Devices[0].ID,
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Session: %s\n", sess.SessionID)

    // 3. Execute a capability
    result, err := cloud.Execute(ctx, sess.SessionID, oahl.ExecuteInput{
        Capability: "screen.capture",
        Params:     map[string]any{"resolution": "1080p"},
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Result: %s\n", result.Status)

    // 4. Release hardware
    cloud.StopSession(ctx, sess.SessionID)
}
```

## Clients

### CloudClient

For agents communicating through the OAHL cloud relay.

```go
cloud := oahl.NewCloudClient(baseURL, apiKey)
cloud := oahl.NewCloudClient(baseURL, apiKey, oahl.WithTimeout(60*time.Second))
```

| Method | Description |
|--------|-------------|
| `GetCapabilities(ctx, query)` | Discover available hardware |
| `RequestSession(ctx, input)` | Reserve a device session |
| `Execute(ctx, sessionID, input)` | Run a capability |
| `StopSession(ctx, sessionID)` | Release the session |
| `GetThingDescription(ctx, deviceID)` | Get W3C WoT Thing Description |

### NodeClient

For direct communication with a local OAHL node server.

```go
node := oahl.NewNodeClient("http://localhost:3000")
```

| Method | Description |
|--------|-------------|
| `Health(ctx)` | Check node server status |
| `GetDevices(ctx)` | List attached devices |
| `GetCapabilities(ctx, deviceID)` | Get device capabilities |
| `StartSession(ctx, deviceID)` | Begin a hardware session |
| `Execute(ctx, sessionID, capability, args)` | Run a capability |
| `StopSession(ctx, sessionID)` | End the session |

## Error Handling

All methods return `*oahl.Error` for HTTP errors:

```go
result, err := cloud.Execute(ctx, sessionID, input)
if err != nil {
    var apiErr *oahl.Error
    if errors.As(err, &apiErr) {
        if apiErr.IsRateLimited() {
            // Back off and retry
        }
        if apiErr.IsNotFound() {
            // Session expired
        }
        if apiErr.IsUnauthorized() {
            // Invalid API key
        }
        fmt.Println(apiErr.Message) // Parsed error message from JSON
    }
}
```

## Configuration

### Custom HTTP Client

```go
client := &http.Client{
    Timeout: 60 * time.Second,
    Transport: &http.Transport{
        MaxIdleConns: 10,
    },
}
cloud := oahl.NewCloudClient(url, key, oahl.WithHTTPClient(client))
```

### Environment Variables

```bash
export OAHL_CLOUD_URL=https://oahl.onrender.com
export OAHL_AGENT_KEY=your-agent-key
```

```go
cloud := oahl.NewCloudClient(
    os.Getenv("OAHL_CLOUD_URL"),
    os.Getenv("OAHL_AGENT_KEY"),
)
```

## Context Support

All methods accept `context.Context` for cancellation and deadlines:

```go
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

result, err := cloud.Execute(ctx, sessionID, input)
```

## License

MIT — see [LICENSE](../../LICENSE)
