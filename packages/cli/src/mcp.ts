import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { CloudClient } from "@oahl/sdk";

export async function runMcpServer(cloudUrl: string, apiKey: string) {
  const client = new CloudClient(cloudUrl, apiKey);
  
  const server = new Server({
    name: "oahl-mcp-server",
    version: "0.1.0"
  }, {
    capabilities: {
      tools: {}
    }
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
      const response = await client.getCapabilities();
      const tools = response.devices.flatMap(device => 
        device.capabilities.map((cap: any) => {
          const capName = typeof cap === 'string' ? cap : cap.name;
          const capDesc = typeof cap === 'string' ? '' : (cap.description || '');
          const capSchema = (typeof cap === 'string' || !cap.schema) ? {
            type: "object",
            properties: {
              params: {
                type: "object",
                description: "Parameters for the capability"
              }
            }
          } : cap.schema;

          return {
            name: `${capName.replace(/\./g, '_')}_${device.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
            description: `[Device: ${device.id}] ${capDesc} ${cap.instructions ? 'Instructions: ' + cap.instructions : ''}`,
            inputSchema: capSchema
          };
        })
      );
      
      return { tools };
    } catch (err: any) {
      console.error(`Error fetching tools: ${err.message}`);
      return { tools: [] };
    }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    // Tool name format: capability_name_deviceId
    const match = request.params.name.match(/^(.*)_([^_]+)$/);
    if (!match) {
      throw new Error(`Invalid tool name: ${request.params.name}`);
    }
    
    const capability = match[1].replace(/_/g, '.');
    const deviceId = match[2];

    try {
      const sessionReq = await client.requestSession({
        capability,
        device_id: deviceId
      });

      const result = await client.execute(sessionReq.session_id, {
        capability,
        params: request.params.arguments || {},
        timeout_ms: 60000
      });

      await client.stopSession(sessionReq.session_id);

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (err: any) {
      return {
        content: [{
          type: "text",
          text: `Error executing capability: ${err.message}`
        }],
        isError: true
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OAHL MCP Server running on stdio");
}
