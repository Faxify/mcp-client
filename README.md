# @faxify/mcp-client

MCP client wrapper for Faxify MCP server. Bridges stdio (Cursor, Claude Desktop, ChatGPT Desktop, and other MCP-compatible AI applications) to HTTP (Next.js MCP server).

## Resources

- **Website**: [https://www.faxify.com](https://www.faxify.com)
- **Web App**: [https://app.faxify.com](https://app.faxify.com)
- **MCP Portal**: [https://mcp.faxify.com](https://mcp.faxify.com)
- **API**: https://api.faxify.com (API documentation coming soon)
- **iOS App**: [App Store](https://apps.apple.com/us/app/faxify-send-fax-from-iphone/id6444380905)
- **Android App**: [Play Store](https://play.google.com/store/apps/details?id=com.constagility.faxify)

## Installation

```bash
npm install -g @faxify/mcp-client
```

Or install locally:

```bash
npm install @faxify/mcp-client
```

## Usage

### For Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "Faxify": {
      "command": "npx",
      "args": ["-y", "@faxify/mcp-client"],
      "env": {
        "FAXIFY_MCP_URL": "https://mcp.faxify.com/api/v1/mcp",
        "FAXIFY_JWT_TOKEN": "YOUR_JWT_TOKEN_HERE"
      }
    }
  }
}
```

### For Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "Faxify": {
      "command": "npx",
      "args": ["-y", "@faxify/mcp-client"],
      "env": {
        "FAXIFY_MCP_URL": "https://mcp.faxify.com/api/v1/mcp",
        "FAXIFY_JWT_TOKEN": "YOUR_JWT_TOKEN_HERE"
      }
    }
  }
}
```

### For ChatGPT Desktop

Edit `~/Library/Application Support/OpenAI/ChatGPT/chatgpt_desktop_config.json` (Mac) or `%APPDATA%/OpenAI/ChatGPT/chatgpt_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "Faxify": {
      "command": "npx",
      "args": ["-y", "@faxify/mcp-client"],
      "env": {
        "FAXIFY_MCP_URL": "https://mcp.faxify.com/api/v1/mcp",
        "FAXIFY_JWT_TOKEN": "YOUR_JWT_TOKEN_HERE"
      }
    }
  }
}
```

**Note:** After updating the configuration file, restart ChatGPT Desktop for the changes to take effect.

### For ChatGPT Web App

ChatGPT Web App supports MCP through custom integrations. Configure it in your ChatGPT account settings:

1. Go to [ChatGPT Settings](https://chat.openai.com/settings)
2. Navigate to **Integrations** or **Model Context Protocol** section
3. Add a new MCP server with:
   - **Name**: `Faxify`
   - **Command**: `npx`
   - **Args**: `-y @faxify/mcp-client`
   - **Environment Variables**:
     - `FAXIFY_MCP_URL`: `https://mcp.faxify.com/api/v1/mcp`
     - `FAXIFY_JWT_TOKEN`: `YOUR_JWT_TOKEN_HERE`

**Note:** MCP support for ChatGPT Web App may vary. Check OpenAI's documentation for the latest integration methods.

### For Other MCP-Compatible Applications

Any AI application that supports the Model Context Protocol (MCP) can use Faxify MCP. The configuration follows the same pattern across all MCP-compatible clients.

**Common MCP-compatible applications include:**

- **Continue.dev** (VS Code extension)
- **Aider** (CLI coding assistant)
- **Other MCP-compatible clients**

**Generic Configuration Pattern:**

Most MCP clients use a JSON configuration file with the following structure:

```json
{
  "mcpServers": {
    "Faxify": {
      "command": "npx",
      "args": ["-y", "@faxify/mcp-client"],
      "env": {
        "FAXIFY_MCP_URL": "https://mcp.faxify.com/api/v1/mcp",
        "FAXIFY_JWT_TOKEN": "YOUR_JWT_TOKEN_HERE"
      }
    }
  }
}
```

**Configuration file locations by application:**

- **Continue.dev**: Usually in VS Code settings or `~/.continue/config.json`
- **Aider**: Check Aider's documentation for MCP configuration file location
- **Other tools**: Refer to your specific application's MCP documentation

**Note:** After updating your configuration file, restart the application for changes to take effect.

## Environment Variables

- `FAXIFY_MCP_URL` - MCP server URL (default: `https://mcp.faxify.com/api/v1/mcp`)
- `FAXIFY_JWT_TOKEN` - JWT token for authentication (get from [Settings → MCP Configuration](https://mcp.faxify.com/en/settings))

## Getting Started

**First, create an account:**

- **Free Plan**: Sign up at [https://mcp.faxify.com](https://mcp.faxify.com)
- **Paid Subscriptions**:
  - Web App: [https://app.faxify.com](https://app.faxify.com)
  - Mobile Apps:
    - **iOS**: Download from [App Store](https://apps.apple.com/us/app/faxify-send-fax-from-iphone/id6444380905)
    - **Android**: Download from [Play Store](https://play.google.com/store/apps/details?id=com.constagility.faxify)

**Then get your JWT token:**

1. Log in to [Faxify MCP](https://mcp.faxify.com)
2. Go to [Settings → MCP Configuration](https://mcp.faxify.com/en/settings)
3. Copy your JWT token
4. Add it to your MCP client configuration

## How It Works

This wrapper script bridges two different transport mechanisms:

1. **MCP-Compatible AI Clients** (Cursor, Claude Desktop, ChatGPT, Continue.dev, Aider, etc.) - Uses stdio (stdin/stdout) for MCP communication
2. **Faxify MCP Server** - Runs as HTTP endpoint on Next.js/Vercel

The wrapper:

- Reads JSON-RPC requests from stdin (line-delimited JSON)
- Makes HTTP POST requests to the MCP server
- Writes responses back to stdout

## License

UNLICENSED - Constagility/Faxify
