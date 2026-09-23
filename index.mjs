#!/usr/bin/env node

/**
 * MCP Client Wrapper for Faxify MCP Server
 *
 * This script acts as a bridge between stdio MCP clients (Cursor, Claude
 * Desktop's config file, Continue and others) and the Faxify MCP server,
 * which runs as an HTTP endpoint.
 *
 * It reads JSON-RPC 2.0 requests from stdin (line-delimited JSON) and forwards them
 * to the HTTP endpoint, then writes the responses back to stdout.
 *
 * Usage:
 *   Set environment variables:
 *   - FAXIFY_MCP_URL: HTTP endpoint URL (default: https://mcp.faxify.com/api/v1/mcp)
 *   - FAXIFY_JWT_TOKEN: Required. Faxify JWT from https://mcp.faxify.com/en/settings
 *     (MCP Configuration). Without it the server rejects initialize.
 *   - FAXIFY_MCP_TIMEOUT_MS: How long to wait for the server (default: 55000)
 *   - FAXIFY_MCP_DEBUG: Set to "true" to enable debug logging (logs to stderr)
 *
 * Note: This client is a transparent proxy - it forwards JSON-RPC requests
 * to the MCP server without modification. The MCP server handles
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

// Claude Desktop and other hosts built on the MCP SDK give up on a tool call
// after 60 seconds and drop any later reply. Answer a little before that, so
// the model gets the "may still complete" error below instead of a bare
// host timeout. Hosts without that limit can raise FAXIFY_MCP_TIMEOUT_MS.
const DEFAULT_TIMEOUT_MS = 55000;
const requestedTimeout = Number(process.env.FAXIFY_MCP_TIMEOUT_MS);
const TIMEOUT_MS =
  Number.isFinite(requestedTimeout) && requestedTimeout > 0
    ? requestedTimeout
    : DEFAULT_TIMEOUT_MS;

const MAY_STILL_COMPLETE =
  "The operation may still complete on the server. Check list_faxes or get_fax_status before retrying send_fax or resend_fax.";

// Parse the endpoint once. A bad FAXIFY_MCP_URL is a configuration error, so
// fail at startup with a clear message instead of on every request.
let url;
try {
  url = new URL(MCP_URL);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`unsupported protocol ${url.protocol}`);
  }
} catch (error) {
  // stderr is the only diagnostic channel a stdio MCP client has.
  // eslint-disable-next-line no-console
  console.error(
    `[Faxify MCP Client] Invalid FAXIFY_MCP_URL "${MCP_URL}": ${error.message}`,
  );
  process.exit(1);
}
const isHttps = url.protocol === "https:";
const client = isHttps ? https : http;

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

  let request;
  try {
    // Parse JSON-RPC request
    request = JSON.parse(line);
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
    return;
  }

  // MCP messages are single JSON objects (no batches).
  if (
    request === null ||
    typeof request !== "object" ||
    Array.isArray(request)
  ) {
    const errorResponse = {
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "Invalid Request: expected a JSON-RPC object",
      },
      id: null,
    };
    process.stdout.write(JSON.stringify(errorResponse) + "\n");
    return;
  }

  // A notification has no id and must never get a response. A request gets
  // exactly one, even if a timeout and a socket error both fire. Note that 0
  // is a valid id.
  const isNotification = request.id === undefined;
  let settled = false;
  const reply = (message) => {
    if (settled || isNotification) {
      return;
    }
    settled = true;
    process.stdout.write(JSON.stringify(message) + "\n");
  };
  const replyError = (code, message, data) => {
    reply({
      jsonrpc: "2.0",
      error: { code, message, ...(data !== undefined && { data }) },
      id: request.id,
    });
  };

  // Optional debug logging (set FAXIFY_MCP_DEBUG=true to enable)
  if (DEBUG && request.method === "tools/call") {
    const toolName = request.params?.name;
    const toolArgs = request.params?.arguments || {};
    // stdout carries the line-delimited JSON-RPC stream, so stderr is the
    // only diagnostic channel a stdio MCP client has. Writing here cannot
    // corrupt the protocol.
    // eslint-disable-next-line no-console
    console.error(
      `[MCP Client Debug] Tool call: ${toolName}\nArguments: ${JSON.stringify(toolArgs, null, 2)}`,
    );
  }

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
    timeout: TIMEOUT_MS,
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
        // For requests with id but empty response, send minimal response.
        // reply() writes nothing for notifications.
        reply({ jsonrpc: "2.0", result: null, id: request.id });
        return;
      }

      let response;
      try {
        // Validate response is valid JSON
        response = JSON.parse(responseData);
      } catch (error) {
        // If response is not valid JSON, return error
        replyError(
          -32603,
          `Invalid response from MCP server: ${error.message}`,
          responseData.substring(0, 500), // Include first 500 chars for debugging
        );
        return;
      }

      // The server can drop an id of 0 on its error paths; give the response
      // back its request's id so the client can match it.
      if (
        response &&
        typeof response === "object" &&
        !Array.isArray(response) &&
        (response.id === null || response.id === undefined)
      ) {
        response.id = request.id;
      }

      // Send response back to the MCP client via stdout (as line-delimited JSON)
      reply(response);
    });

    // The connection can drop after the headers arrive. Without this the
    // client would wait forever for an answer.
    res.on("close", () => {
      if (!res.complete) {
        replyError(
          -32603,
          `Connection to MCP server closed before the response completed. ${MAY_STILL_COMPLETE}`,
        );
      }
    });
  });

  req.on("error", (error) => {
    // Once the whole request has been sent, the server may already be acting
    // on it (a send_fax may go out), so don't report it as never delivered.
    if (req.writableFinished) {
      replyError(
        -32603,
        `Connection to MCP server lost after the request was sent (${error.message}). ${MAY_STILL_COMPLETE}`,
      );
      return;
    }
    replyError(-32603, `Failed to connect to MCP server: ${error.message}`, {
      url: MCP_URL,
      hint: JWT_TOKEN
        ? "Server may be down or check your JWT token. Verify your token at https://mcp.faxify.com/en/settings"
        : "JWT token required. Get your token from https://mcp.faxify.com/en/settings",
    });
  });

  req.on("timeout", () => {
    // Answer first, then destroy: destroying fires an 'error' event that
    // reply() ignores because this request is already answered.
    replyError(
      -32603,
      `Request timeout: MCP server did not respond within ${TIMEOUT_MS / 1000} seconds. ${MAY_STILL_COMPLETE}`,
    );
    req.destroy();
  });

  // Send request body
  req.write(JSON.stringify(request));
  req.end();
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
