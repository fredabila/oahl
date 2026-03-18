package oahl

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// NodeClient communicates directly with a local OAHL node server.
type NodeClient struct {
	baseURL    string
	httpClient *http.Client
}

// NodeOption configures a NodeClient.
type NodeOption func(*NodeClient)

// WithNodeHTTPClient sets a custom http.Client for the node client.
func WithNodeHTTPClient(c *http.Client) NodeOption {
	return func(nc *NodeClient) { nc.httpClient = c }
}

// NewNodeClient creates a client for a local OAHL node.
//
//	client := oahl.NewNodeClient("http://localhost:3000")
func NewNodeClient(baseURL string, opts ...NodeOption) *NodeClient {
	nc := &NodeClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
	for _, opt := range opts {
		opt(nc)
	}
	return nc
}

// Health checks if the node server is running.
func (n *NodeClient) Health(ctx context.Context) (*HealthResponse, error) {
	cc := n.asCloudClient()
	var resp HealthResponse
	if err := cc.doJSON(ctx, http.MethodGet, n.baseURL+"/health", nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// GetDevices returns all devices attached to the node.
func (n *NodeClient) GetDevices(ctx context.Context) ([]Device, error) {
	cc := n.asCloudClient()
	var devices []Device
	if err := cc.doJSON(ctx, http.MethodGet, n.baseURL+"/devices", nil, &devices); err != nil {
		return nil, err
	}
	return devices, nil
}

// GetCapabilities returns capabilities for a specific device.
func (n *NodeClient) GetCapabilities(ctx context.Context, deviceID string) ([]Capability, error) {
	cc := n.asCloudClient()
	u := fmt.Sprintf("%s/capabilities?deviceId=%s", n.baseURL, url.QueryEscape(deviceID))
	var caps []Capability
	if err := cc.doJSON(ctx, http.MethodGet, u, nil, &caps); err != nil {
		return nil, err
	}
	return caps, nil
}

// StartSession begins a hardware session on the node.
func (n *NodeClient) StartSession(ctx context.Context, deviceID string) (*Session, error) {
	cc := n.asCloudClient()
	var sess Session
	if err := cc.doJSON(ctx, http.MethodPost, n.baseURL+"/sessions/start", map[string]string{"deviceId": deviceID}, &sess); err != nil {
		return nil, err
	}
	return &sess, nil
}

// Execute runs a capability on a device through the node.
func (n *NodeClient) Execute(ctx context.Context, sessionID, capabilityName string, args map[string]any) (*ExecutionResult, error) {
	cc := n.asCloudClient()
	body := map[string]any{
		"sessionId":      sessionID,
		"capabilityName": capabilityName,
		"args":           args,
	}
	var result ExecutionResult
	if err := cc.doJSON(ctx, http.MethodPost, n.baseURL+"/execute", body, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// StopSession ends an active session on the node.
func (n *NodeClient) StopSession(ctx context.Context, sessionID string) error {
	cc := n.asCloudClient()
	return cc.doJSON(ctx, http.MethodPost, n.baseURL+"/sessions/stop", map[string]string{"sessionId": sessionID}, nil)
}

// asCloudClient reuses CloudClient's doJSON for HTTP logic.
func (n *NodeClient) asCloudClient() *CloudClient {
	return &CloudClient{
		baseURL:    n.baseURL,
		httpClient: n.httpClient,
	}
}
