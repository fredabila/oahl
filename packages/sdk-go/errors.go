package oahl

import "fmt"

// Error represents an API error returned by an OAHL endpoint.
type Error struct {
	StatusCode int    // HTTP status code
	RawBody    string // Raw response body
	Message    string // Parsed error message (from JSON "error" field, if present)
}

func (e *Error) Error() string {
	if e.Message != "" {
		return fmt.Sprintf("oahl: HTTP %d: %s", e.StatusCode, e.Message)
	}
	return fmt.Sprintf("oahl: HTTP %d: %s", e.StatusCode, e.RawBody)
}

// IsNotFound returns true if the error is a 404.
func (e *Error) IsNotFound() bool { return e.StatusCode == 404 }

// IsRateLimited returns true if the error is a 429 (rate limit exceeded).
func (e *Error) IsRateLimited() bool { return e.StatusCode == 429 }

// IsUnauthorized returns true if the error is a 401 or 403.
func (e *Error) IsUnauthorized() bool { return e.StatusCode == 401 || e.StatusCode == 403 }

// IsServerError returns true if the error is a 5xx.
func (e *Error) IsServerError() bool { return e.StatusCode >= 500 }
