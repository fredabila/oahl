package oahl

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// CloudClient communicates with the OAHL Cloud Relay.
//
// It provides agent-side methods: discover hardware, request sessions,
// execute capabilities, and release sessions.
type CloudClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

// CloudOption configures a CloudClient.
type CloudOption func(*CloudClient)

// WithHTTPClient sets a custom http.Client for the cloud client.
func WithHTTPClient(c *http.Client) CloudOption {
	return func(cc *CloudClient) { cc.httpClient = c }
}

// WithTimeout sets the HTTP request timeout.
func WithTimeout(d time.Duration) CloudOption {
	return func(cc *CloudClient) { cc.httpClient.Timeout = d }
}

// NewCloudClient creates a client for the OAHL cloud relay.
//
//	client := oahl.NewCloudClient("https://oahl.onrender.com", "your-agent-key")
func NewCloudClient(baseURL, apiKey string, opts ...CloudOption) *CloudClient {
	cc := &CloudClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
	for _, opt := range opts {
		opt(cc)
	}
	return cc
}

// SetAPIKey updates the agent API key.
func (c *CloudClient) SetAPIKey(key string) {
	c.apiKey = key
}

// GetCapabilities discovers available hardware on the cloud relay.
func (c *CloudClient) GetCapabilities(ctx context.Context, query *CapabilitiesQuery) (*CapabilitiesResponse, error) {
	u := c.baseURL + "/v1/capabilities"

	if query != nil {
		params := url.Values{}
		if query.Q != "" {
			params.Set("q", query.Q)
		}
		if query.Type != "" {
			params.Set("type", query.Type)
		}
		if query.Provider != "" {
			params.Set("provider", query.Provider)
		}
		if query.NodeID != "" {
			params.Set("node_id", query.NodeID)
		}
		if query.Capability != "" {
			params.Set("capability", query.Capability)
		}
		if query.Page > 0 {
			params.Set("page", fmt.Sprintf("%d", query.Page))
		}
		if query.PageSize > 0 {
			params.Set("page_size", fmt.Sprintf("%d", query.PageSize))
		}
		if qs := params.Encode(); qs != "" {
			u += "?" + qs
		}
	}

	var resp CapabilitiesResponse
	if err := c.doJSON(ctx, http.MethodGet, u, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// RequestSession reserves a hardware session on a device.
func (c *CloudClient) RequestSession(ctx context.Context, input SessionRequest) (*SessionResponse, error) {
	var resp SessionResponse
	if err := c.doJSON(ctx, http.MethodPost, c.baseURL+"/v1/requests", input, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// Execute runs a capability on a device through an active session.
func (c *CloudClient) Execute(ctx context.Context, sessionID string, input ExecuteInput) (*ExecutionResult, error) {
	u := fmt.Sprintf("%s/v1/sessions/%s/execute", c.baseURL, url.PathEscape(sessionID))
	var resp ExecutionResult
	if err := c.doJSON(ctx, http.MethodPost, u, input, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// StopSession releases an active hardware session.
func (c *CloudClient) StopSession(ctx context.Context, sessionID string) (*StopSessionResponse, error) {
	u := fmt.Sprintf("%s/v1/sessions/%s/stop", c.baseURL, url.PathEscape(sessionID))
	var resp StopSessionResponse
	if err := c.doJSON(ctx, http.MethodPost, u, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// GetThingDescription retrieves the W3C WoT Thing Description for a device.
func (c *CloudClient) GetThingDescription(ctx context.Context, deviceID string) (json.RawMessage, error) {
	u := fmt.Sprintf("%s/v1/things/%s", c.baseURL, url.PathEscape(deviceID))
	var raw json.RawMessage
	if err := c.doJSON(ctx, http.MethodGet, u, nil, &raw); err != nil {
		return nil, err
	}
	return raw, nil
}

func (c *CloudClient) doJSON(ctx context.Context, method, u string, body any, result any) error {
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("oahl: marshal request body: %w", err)
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, u, bodyReader)
	if err != nil {
		return fmt.Errorf("oahl: create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("oahl: do request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("oahl: read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		apiErr := &Error{
			StatusCode: resp.StatusCode,
			RawBody:    string(respBody),
		}
		// Try to parse JSON error
		var errObj struct {
			Error string `json:"error"`
		}
		if json.Unmarshal(respBody, &errObj) == nil && errObj.Error != "" {
			apiErr.Message = errObj.Error
		}
		return apiErr
	}

	if result != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, result); err != nil {
			return fmt.Errorf("oahl: unmarshal response: %w", err)
		}
	}

	return nil
}
