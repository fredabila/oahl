package oahl

import "encoding/json"

// Device represents a hardware device registered on an OAHL node.
type Device struct {
	ID              string            `json:"id"`
	Type            string            `json:"type"`
	Name            string            `json:"name"`
	IsPublic        bool              `json:"isPublic"`
	Manufacturer    string            `json:"manufacturer,omitempty"`
	Model           string            `json:"model,omitempty"`
	SerialNumber    string            `json:"serial_number,omitempty"`
	SemanticContext []string          `json:"semantic_context,omitempty"`
	Metadata        map[string]any    `json:"metadata,omitempty"`
	Pricing         *PricingDescriptor `json:"pricing,omitempty"`
}

// Capability describes a named hardware action that can be executed on a device.
type Capability struct {
	Name         string             `json:"name"`
	Description  string             `json:"description"`
	Schema       json.RawMessage    `json:"schema"`
	Instructions string             `json:"instructions,omitempty"`
	SemanticType string             `json:"semantic_type,omitempty"`
	HelperURL    string             `json:"helper_url,omitempty"`
	Template     string             `json:"template,omitempty"`
	Context      string             `json:"context,omitempty"`
	Metadata     map[string]any     `json:"metadata,omitempty"`
	Pricing      *PricingDescriptor `json:"pricing,omitempty"`
}

// PricingDescriptor describes optional billing for device or capability usage.
type PricingDescriptor struct {
	Currency         string  `json:"currency"`
	RatePerMinute    float64 `json:"rate_per_minute,omitempty"`
	RatePerExecution float64 `json:"rate_per_execution,omitempty"`
	PaymentAddress   string  `json:"payment_address,omitempty"`
}

// Session represents an active hardware reservation.
type Session struct {
	ID        string `json:"id"`
	DeviceID  string `json:"deviceId"`
	StartTime int64  `json:"startTime"`
	Status    string `json:"status"` // "active" | "stopped"
}

// ExecutionResult is the structured response from executing a capability.
type ExecutionResult struct {
	Status             string   `json:"status"` // "success" | "error"
	ErrorCode          string   `json:"error_code,omitempty"`
	Message            string   `json:"message,omitempty"`
	Data               any      `json:"data,omitempty"`
	AgentRecoveryHints []string `json:"agent_recovery_hints,omitempty"`
}

// --- Cloud-specific types ---

// CapabilitiesQuery filters devices when calling CloudClient.GetCapabilities.
type CapabilitiesQuery struct {
	Q          string `url:"q,omitempty"`
	Type       string `url:"type,omitempty"`
	Provider   string `url:"provider,omitempty"`
	NodeID     string `url:"node_id,omitempty"`
	Capability string `url:"capability,omitempty"`
	Page       int    `url:"page,omitempty"`
	PageSize   int    `url:"page_size,omitempty"`
}

// CapabilityDevice is a device entry returned by the cloud discovery endpoint.
type CapabilityDevice struct {
	ID              string        `json:"id"`
	Type            string        `json:"type"`
	Name            string        `json:"name,omitempty"`
	Capabilities    []Capability  `json:"capabilities"`
	Provider        string        `json:"provider"`
	NodeID          string        `json:"node_id"`
	Manufacturer    string        `json:"manufacturer,omitempty"`
	Model           string        `json:"model,omitempty"`
	SerialNumber    string        `json:"serial_number,omitempty"`
	SemanticContext []string      `json:"semantic_context,omitempty"`
	Status          string        `json:"status"`
}

// Pagination contains page metadata from paginated responses.
type Pagination struct {
	Page       int  `json:"page"`
	PageSize   int  `json:"page_size"`
	Total      int  `json:"total"`
	TotalPages int  `json:"total_pages"`
	HasNext    bool `json:"has_next"`
	HasPrev    bool `json:"has_prev"`
}

// CapabilitiesResponse is returned by CloudClient.GetCapabilities.
type CapabilitiesResponse struct {
	Timestamp  int64              `json:"timestamp"`
	Devices    []CapabilityDevice `json:"devices"`
	Pagination *Pagination        `json:"pagination,omitempty"`
}

// SessionRequest is the input to CloudClient.RequestSession.
type SessionRequest struct {
	Capability string `json:"capability,omitempty"`
	DeviceID   string `json:"device_id,omitempty"`
	NodeID     string `json:"node_id,omitempty"`
}

// SessionResponse is returned by CloudClient.RequestSession.
type SessionResponse struct {
	SessionID string `json:"session_id"`
	Status    string `json:"status"`
}

// ExecuteInput is the input to CloudClient.Execute.
type ExecuteInput struct {
	Capability string         `json:"capability"`
	Params     map[string]any `json:"params,omitempty"`
	TimeoutMs  int            `json:"timeout_ms,omitempty"`
}

// StopSessionResponse is returned by CloudClient.StopSession.
type StopSessionResponse struct {
	Status string `json:"status"`
}

// HealthResponse is returned by NodeClient.Health.
type HealthResponse struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
}
