import requests
from typing import Dict, Any, List, Optional

class OahlClient:
    def __init__(self, base_url: str = 'http://localhost:3000'):
        self.base_url = base_url.rstrip('/')

    def health(self) -> Dict[str, Any]:
        response = requests.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()

    def get_devices(self) -> List[Dict[str, Any]]:
        response = requests.get(f"{self.base_url}/devices")
        response.raise_for_status()
        return response.json()

    def get_capabilities(self, device_id: str) -> List[Dict[str, Any]]:
        response = requests.get(f"{self.base_url}/capabilities", params={"deviceId": device_id})
        response.raise_for_status()
        return response.json()

    def start_session(self, device_id: str) -> Dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/sessions/start",
            json={"deviceId": device_id}
        )
        response.raise_for_status()
        return response.json()

    def execute(self, session_id: str, capability_name: str, args: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        payload = {
            "sessionId": session_id,
            "capabilityName": capability_name,
            "args": args or {}
        }
        response = requests.post(f"{self.base_url}/execute", json=payload)
        response.raise_for_status()
        return response.json()

    def stop_session(self, session_id: str) -> Dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/sessions/stop",
            json={"sessionId": session_id}
        )
        response.raise_for_status()
        return response.json()

    def get_session(self, session_id: str) -> Dict[str, Any]:
        response = requests.get(f"{self.base_url}/sessions/{session_id}")
        response.raise_for_status()
        return response.json()
