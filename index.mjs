#!/usr/bin/env node

/**
 * MCP Client Wrapper for Faxify MCP Server
 *
 * This script acts as a bridge between Cursor (which uses stdio MCP transport)
 * and the Faxify MCP server (which runs as an HTTP endpoint).
 *
 * It reads JSON-RPC 2.0 requests from stdin (line-delimited JSON) and forwards them
 * to the HTTP endpoint, then writes the responses back to stdout.
 *
 * Usage:
 *   Set environment variables:
 *   - FAXIFY_MCP_URL: HTTP endpoint URL (default: https://mcp.faxify.com/api/v1/mcp)
 *   - FAXIFY_JWT_TOKEN: Optional JWT token for authentication (get from browser)
 *   - FAXIFY_MCP_DEBUG: Set to "true" to enable debug logging (logs to stderr)
 *
 * Note: This client is a transparent proxy - it forwards JSON-RPC requests
 * from Cursor to the MCP server without modification. The MCP server handles
 * both nested and flattened parameter structures for compatibility.
 */

import http from "http";
import https from "https";
import { URL } from "url";
import readline from "readline";

const MCP_URL =
  process.env.FAXIFY_MCP_URL || "https://mcp.faxify.com/api/v1/mcp";
const JWT_TOKEN = process.env.FAXIFY_JWT_TOKEN || "";
const DEBUG = process.env.FAXIFY_MCP_DEBUG === "true";

// Set up readline interface for line-by-line reading
// MCP uses line-delimited JSON (NDJSON) over stdio
// Don't write to stdout via readline - it interferes with JSON-RPC responses
// Use process.stdout.write directly for responses
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

// Process each line (each line is a JSON-RPC request)
rl.on("line", async (line) => {
  // Skip empty lines
  if (!line.trim()) {
    return;
  }

  try {
    // Parse JSON-RPC request
    const request = JSON.parse(line);

    // Optional debug logging (set FAXIFY_MCP_DEBUG=true to enable)
    if (DEBUG && request.method === "tools/call") {
      const toolName = request.params?.name;
      const toolArgs = request.params?.arguments || {};
      // Log to stderr (not stdout) so it doesn't interfere with JSON-RPC responses.

      // available to a stdio MCP client; stdout is reserved for the protocol.
      console.error(
        `[MCP Client Debug] Tool call: ${toolName}\nArguments: ${JSON.stringify(toolArgs, null, 2)}`,
      );
    }

    // Parse URL to determine protocol
    const url = new URL(MCP_URL);
    const isHttps = url.protocol === "https:";
    const client = isHttps ? https : http;

    // Prepare HTTP request options
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + (url.search || ""),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(JWT_TOKEN && { Authorization: `Bearer ${JWT_TOKEN}` }),
      },
      timeout: 30000, // 30 second timeout
    };

    // Make HTTP request to MCP server
    const req = client.request(options, (res) => {
      let responseData = "";

      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        // Handle empty responses (for notifications)
        if (!responseData || responseData.trim() === "") {
          // For notifications (no id), don't send a response
          // JSON-RPC 2.0 notifications don't require a response
          if (!request.id || request.id === null || request.id === undefined) {
            return; // Don't write anything for notifications
          }
          // For requests with id but empty response, send minimal response
          const minimalResponse = {
            jsonrpc: "2.0",
            result: null,
            id: request.id,
          };
          process.stdout.write(JSON.stringify(minimalResponse) + "\n");
          return;
        }

        try {
          // Validate response is valid JSON
          const response = JSON.parse(responseData);

          // Send response back to Cursor via stdout (as line-delimited JSON)
          process.stdout.write(JSON.stringify(response) + "\n");
        } catch (error) {
          // If response is not valid JSON, return error
          const errorResponse = {
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: `Invalid response from MCP server: ${error.message}`,
              data: responseData.substring(0, 500), // Include first 500 chars for debugging
            },
            id: request.id || null,
          };
          process.stdout.write(JSON.stringify(errorResponse) + "\n");
        }
      });
    });

    req.on("error", (error) => {
      // Return error response
      const errorResponse = {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: `Failed to connect to MCP server: ${error.message}`,
          data: {
            url: MCP_URL,
            hint: JWT_TOKEN
              ? "Server may be down or check your JWT token. Verify your token at https://mcp.faxify.com/en/settings"
              : "JWT token required. Get your token from https://mcp.faxify.com/en/settings",
          },
        },
        id: request.id || null,
      };
      process.stdout.write(JSON.stringify(errorResponse) + "\n");
    });

    req.on("timeout", () => {
      req.destroy();
      const errorResponse = {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message:
            "Request timeout: MCP server did not respond within 30 seconds",
        },
        id: request.id || null,
      };
      process.stdout.write(JSON.stringify(errorResponse) + "\n");
    });

    // Send request body
    req.write(JSON.stringify(request));
    req.end();
  } catch (error) {
    // Invalid JSON input
    const errorResponse = {
      jsonrpc: "2.0",
      error: {
        code: -32700,
        message: `Parse error: ${error.message}`,
      },
      id: null,
    };
    process.stdout.write(JSON.stringify(errorResponse) + "\n");
  }
});

// Handle errors on stdin
process.stdin.on("error", (_error) => {
  // Don't log to stderr - Cursor might interpret this as an error
  // Just silently handle the error
  process.exit(1);
});

// Handle process termination gracefully
process.on("SIGINT", () => {
  rl.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  rl.close();
  process.exit(0);
});
