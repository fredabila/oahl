import requests
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass

@dataclass
class Device:
    id: str
    type: str
    name: str
    isPublic: bool
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    semantic_context: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    pricing: Optional[Dict[str, Any]] = None

@dataclass
class Capability:
    name: str
    description: str
    schema: Dict[str, Any]
    instructions: Optional[str] = None
    semantic_type: Optional[str] = None
    helper_url: Optional[str] = None
    template: Optional[str] = None
    context: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    pricing: Optional[Dict[str, Any]] = None

@dataclass
class Session:
    id: str
    deviceId: str
    startTime: int
    status: str

class HttpClient:
    def _request(self, method: str, url: str, **kwargs) -> Any:
        response = requests.request(method, url, **kwargs)
        if not response.ok:
            try:
                error_data = response.json()
                message = error_data.get('error', response.text)
            except Exception:
                message = response.text
            raise Exception(f"HTTP error {response.status_code}: {message}")
        
        if response.status_code == 204:
            return None
        return response.json()

class OahlClient(HttpClient):
    """
    Client for interacting with a local or self-hosted OAHL server.
    """
    def __init__(self, base_url: str = 'http://localhost:3000'):
        self.base_url = base_url.rstrip('/')

    def health(self) -> Dict[str, Any]:
        """Check the health of the OAHL server."""
        return self._request("GET", f"{self.base_url}/health")

    def get_devices(self) -> List[Dict[str, Any]]:
        """List all devices managed by this OAHL server."""
        return self._request("GET", f"{self.base_url}/devices")

    def get_capabilities(self, device_id: str) -> List[Dict[str, Any]]:
        """Get capabilities for a specific device."""
        return self._request("GET", f"{self.base_url}/capabilities", params={"deviceId": device_id})

    def start_session(self, device_id: str) -> Dict[str, Any]:
        """Start a session for a specific device."""
        return self._request("POST", f"{self.base_url}/sessions/start", json={"deviceId": device_id})

    def execute(self, session_id: str, capability_name: str, args: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute a capability on a device within an active session."""
        payload = {
            "sessionId": session_id,
            "capabilityName": capability_name,
            "args": args or {}
        }
        return self._request("POST", f"{self.base_url}/execute", json=payload)

    def stop_session(self, session_id: str) -> Dict[str, Any]:
        """Stop an active session."""
        return self._request("POST", f"{self.base_url}/sessions/stop", json={"sessionId": session_id})

    def get_session(self, session_id: str) -> Dict[str, Any]:
        """Get the status of a specific session."""
        return self._request("GET", f"{self.base_url}/sessions/{session_id}")

class CloudClient(HttpClient):
    """
    Client for interacting with the OAHL Cloud relay.
    """
    def __init__(self, base_url: str = 'https://oahl.onrender.com', agent_api_key: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.agent_api_key = agent_api_key

    def set_agent_api_key(self, agent_api_key: str):
        """Set the API key for authenticating with the cloud relay."""
        self.agent_api_key = agent_api_key

    def _auth_headers(self, additional_headers: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        headers = {
            'Content-Type': 'application/json'
        }
        if self.agent_api_key:
            headers['Authorization'] = f'Bearer {self.agent_api_key}'
        
        if additional_headers:
            headers.update(additional_headers)
        return headers

    def get_capabilities(self, query: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Query capabilities across the OAHL Cloud network."""
        return self._request("GET", f"{self.base_url}/v1/capabilities", params=query, headers=self._auth_headers())

    def request_session(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Request a session for a device or capability via the cloud relay."""
        return self._request("POST", f"{self.base_url}/v1/requests", json=input_data, headers=self._auth_headers())

    def execute(self, session_id: str, input_data: Dict[str, Any]) -> Any:
        """Execute a capability via the cloud relay."""
        return self._request(
            "POST", 
            f"{self.base_url}/v1/sessions/{session_id}/execute", 
            json=input_data, 
            headers=self._auth_headers()
        )

    def stop_session(self, session_id: str) -> Dict[str, Any]:
        """Stop a cloud session."""
        return self._request(
            "POST", 
            f"{self.base_url}/v1/sessions/{session_id}/stop", 
            headers=self._auth_headers()
        )
