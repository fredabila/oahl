from oahl import OahlClient
import json
import time

NODE_URL = "http://localhost:3000"

print("🤖 AI Agent: Waking up...")
print(f"🤖 AI Agent: Connecting to local hardware node at {NODE_URL}...\n")

client = OahlClient(NODE_URL)

try:
    # 1. Check what devices are available
    print("Agent: Hey Node, what hardware do you have?")
    devices = client.get_devices()
    
    if not devices:
        print("Node: No devices found.")
        exit()
        
    print(f"Node: I have these devices: {json.dumps(devices, indent=2)}\n")
    
    # Let's pick the first camera we find
    camera = next((d for d in devices if d['type'] == 'camera'), devices[0])
    print(f"Agent: I need a picture. I'll use {camera['name']} ({camera['id']}).")
    
    # 2. Start a session
    print(f"\nAgent: Requesting session for {camera['id']}...")
    session = client.start_session(camera['id'])
    session_id = session['id']
    print(f"Node: Session approved. Your session ID is {session_id}\n")
    
    # 3. Execute the capability (the Adapter does the work here!)
    print(f"Agent: Executing capability 'camera.capture'...")
    result = client.execute(session_id, "camera.capture", {
        "resolution": "1080p"
    })
    
    print("Node: Success! Here is your hardware result:")
    print(json.dumps(result, indent=2))
    
    # 4. Cleanup
    print(f"\nAgent: I'm done. Closing session {session_id}.")
    client.stop_session(session_id)
    print("Node: Session closed. Goodbye!")

except Exception as e:
    print(f"\n❌ Error: {e}")
    print("Make sure you started the server with: cd packages/server && npm start")
