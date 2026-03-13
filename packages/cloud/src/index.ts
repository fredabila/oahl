import express from 'express';

const app = express();
app.use(express.json());

// In-memory registry for our MVP
// In production, this would be Redis or a Database (PostgreSQL/MongoDB)
const registeredNodes = new Map<string, any>();
const activeSessions = new Map<string, any>();

console.log("☁️ OAHL Cloud Registry booting up...");

/**
 * 1. NODE REGISTRATION
 * Hardware nodes call this to say "I am online and here is my hardware"
 */
app.post('/v1/provider/nodes/register', (req, res) => {
  const nodeData = req.body;
  
  if (!nodeData.node_id) {
    return res.status(400).json({ error: "Missing node_id" });
  }

  // Update our registry with this node's information and timestamp
  nodeData.last_seen = Date.now();
  registeredNodes.set(nodeData.node_id, nodeData);

  console.log(`[Cloud] 🟢 Node registered: ${nodeData.node_id} with ${nodeData.devices?.length || 0} devices.`);
  
  res.json({ status: "success", message: "Node registered successfully" });
});

/**
 * 2. AGENT DISCOVERY
 * AI Agents call this to ask "What capabilities are available right now?"
 */
app.get('/v1/capabilities', (req, res) => {
  const capabilities = new Set<string>();
  const capabilityMap: any[] = [];

  // Loop through all active nodes and aggregate capabilities
  for (const [nodeId, node] of Array.from(registeredNodes.entries())) {
    if (node.devices) {
      for (const device of node.devices) {
        if (device.capabilities) {
          device.capabilities.forEach((cap: string) => {
            if (!capabilities.has(cap)) {
              capabilities.add(cap);
              capabilityMap.push({
                name: cap,
                nodes_available: 1
              });
            } else {
              const existing = capabilityMap.find(c => c.name === cap);
              if (existing) existing.nodes_available++;
            }
          });
        }
      }
    }
  }

  res.json({ available_capabilities: capabilityMap });
});

/**
 * 3. AGENT REQUEST
 * AI Agents call this to request a specific hardware capability.
 * The Cloud finds a matching node.
 */
app.post('/v1/requests', (req, res) => {
  const { capability, constraints } = req.body;
  
  if (!capability) {
    return res.status(400).json({ error: "Must specify a capability" });
  }

  console.log(`[Cloud] 🤖 Agent requesting capability: ${capability}`);

  // Simple matchmaking: Find the first node that has a device with this capability
  let matchedNode = null;
  let matchedDevice = null;

  for (const [nodeId, node] of Array.from(registeredNodes.entries())) {
    const device = node.devices?.find((d: any) => d.capabilities?.includes(capability));
    if (device) {
      matchedNode = node;
      matchedDevice = device;
      break;
    }
  }

  if (!matchedNode) {
    console.log(`[Cloud] ❌ No available hardware found for: ${capability}`);
    return res.status(404).json({ error: "No available hardware for this capability" });
  }

  // Generate a cloud session ID
  const sessionId = "cloud-sess-" + Math.random().toString(36).substring(7);
  
  activeSessions.set(sessionId, {
    node_id: matchedNode.node_id,
    device_id: matchedDevice.id,
    capability: capability,
    status: 'assigned'
  });

  console.log(`[Cloud] ✅ Matched agent to node ${matchedNode.node_id} (Device: ${matchedDevice.id})`);

  res.json({
    request_id: "req-" + Date.now(),
    session_id: sessionId,
    status: "accepted",
    assigned_node: matchedNode.node_id
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`☁️ OAHL Cloud Service running on port ${PORT}`);
});
