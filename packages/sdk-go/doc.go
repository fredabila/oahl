// Package oahl provides Go client libraries for the OAHL (Open Agent Hardware Layer) protocol.
//
// Two clients are available:
//   - [NodeClient] for direct communication with a local OAHL node server
//   - [CloudClient] for communication via the OAHL cloud relay
//
// # Quick Start
//
//	cloud := oahl.NewCloudClient("https://oahl.onrender.com", "your-agent-key")
//
//	// Discover hardware
//	resp, _ := cloud.GetCapabilities(ctx, nil)
//
//	// Reserve a session
//	sess, _ := cloud.RequestSession(ctx, oahl.SessionRequest{DeviceID: resp.Devices[0].ID})
//
//	// Execute
//	result, _ := cloud.Execute(ctx, sess.SessionID, oahl.ExecuteInput{
//	    Capability: "screen.capture",
//	    Params:     map[string]any{"resolution": "1080p"},
//	})
//
//	// Release
//	cloud.StopSession(ctx, sess.SessionID)
package oahl
