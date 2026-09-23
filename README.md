# @faxify/mcp-client

stdio bridge for the hosted Faxify MCP server. It lets MCP clients that launch local stdio servers (Cursor, Claude Desktop's config file, Continue.dev and others) reach `https://mcp.faxify.com/api/v1/mcp` over HTTP.

Clients that connect to remote MCP servers over OAuth don't need this package: in ChatGPT (developer mode) or as a Claude custom connector, add `https://mcp.faxify.com/api/v1/mcp` and sign in (see below).

## Resources

- **Website**: [https://www.faxify.com](https://www.faxify.com)
- **Web App**: [https://app.faxify.com](https://app.faxify.com)
- **MCP Portal**: [https://mcp.faxify.com](https://mcp.faxify.com)
- **API**: https://api.faxify.com (API documentation coming soon)
- **iOS App**: [App Store](https://apps.apple.com/us/app/faxify-fax-app-from-iphone/id6444380905)
- **Android App**: [Play Store](https://play.google.com/store/apps/details?id=com.constagility.faxify)

## Installation

Requires Node.js 18 or later, with `npx` on your PATH. There is nothing to install: the MCP configurations below run `npx -y @faxify/mcp-client`, which downloads and starts the bridge.

A global install also works and adds the `faxify-mcp-client` command:

```bash
npm install -g @faxify/mcp-client
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

You can also connect Claude without the bridge: see [For Claude (custom connector)](#for-claude-custom-connector).

### For Claude (custom connector)

Claude can connect to the Faxify MCP server directly over OAuth, with no token to copy and no bridge:

1. In Claude (claude.ai or the desktop app), go to **Customize → Connectors**, click **+** and choose **Add custom connector**
2. Enter the URL `https://mcp.faxify.com/api/v1/mcp`
3. Sign in to Faxify when prompted (Google SSO, Apple SSO, or Email/OTP)

On Team and Enterprise plans, an Owner adds the connector under **Organization settings → Connectors**, and members then click **Connect** under **Customize → Connectors**. Anthropic's current steps: [Get started with custom connectors using remote MCP](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).

### For ChatGPT (developer mode)

ChatGPT connects to the Faxify MCP server directly over OAuth, with no bridge. Developer mode is available on the web for Plus, Pro, Business, Enterprise and Education accounts:

1. On chatgpt.com, open **Settings → Security and login** and turn on **Developer mode**
2. Go to [chatgpt.com/plugins](https://chatgpt.com/plugins), click **+** and create an app with the MCP URL `https://mcp.faxify.com/api/v1/mcp`
3. Sign in to Faxify when prompted:
   - **Google SSO**: Sign in with your Google account
   - **Apple SSO**: Sign in with your Apple ID
   - **Email/OTP**: Enter your email and verify with the one-time password
4. Once authenticated, the Faxify app is available in your ChatGPT chats

OpenAI's current steps: [Developer mode](https://developers.openai.com/api/docs/guides/developer-mode).

### For Other MCP-Compatible Applications

Any AI application that supports the Model Context Protocol (MCP) can use Faxify MCP. The configuration follows the same pattern across all MCP-compatible clients.

**Common MCP-compatible applications include:**

- **Continue.dev** (VS Code and JetBrains extension)
- **Other MCP-compatible clients** that launch stdio servers

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

- **Continue.dev**: save the JSON above as `.continue/mcpServers/faxify.json` in your workspace (or add an `mcpServers` entry to your Continue `config.yaml`). The file contains your token, so add `.continue/mcpServers/` to your `.gitignore`, or keep the token in Continue's secrets and reference it as `${{ secrets.FAXIFY_JWT_TOKEN }}` in `config.yaml`.
- **Other tools**: Refer to your specific application's MCP documentation

**Note:** After updating your configuration file, restart the application for changes to take effect.

## Environment Variables

- `FAXIFY_MCP_URL` - MCP server URL (default: `https://mcp.faxify.com/api/v1/mcp`)
- `FAXIFY_JWT_TOKEN` - JWT token for authentication (get from [Settings → MCP Configuration](https://mcp.faxify.com/en/settings)). Required: without it the server rejects the MCP handshake, so no tool is reachable.
- `FAXIFY_MCP_TIMEOUT_MS` - How long to wait for the server, in milliseconds (default: `55000`). The default answers just before the 60-second tool-call limit in Claude Desktop and other clients built on the MCP SDK, so the model sees why the call stopped. Clients without that limit (such as Cursor) can raise it. If a call times out, it may still complete on the server: check `list_faxes` or `get_fax_status` before sending again.
- `FAXIFY_MCP_DEBUG` - Set to exactly `true` to log each tool call's name and arguments to stderr (off by default). The arguments include fax numbers, cover-page text and file links, and your MCP client may keep stderr in its log files, so turn it off when you're done debugging. The JWT is never logged.

## Getting Started

**First, create an account:**

- **Free Plan**: Sign up at [https://mcp.faxify.com](https://mcp.faxify.com)
- **Paid Subscriptions**:
  - Web App: [https://app.faxify.com](https://app.faxify.com)
  - Mobile Apps:
    - **iOS**: Download from [App Store](https://apps.apple.com/us/app/faxify-fax-app-from-iphone/id6444380905)
    - **Android**: Download from [Play Store](https://play.google.com/store/apps/details?id=com.constagility.faxify)

### Authentication Methods

**For ChatGPT (developer mode) and Claude custom connectors (OAuth, no bridge):**

1. Add the MCP URL `https://mcp.faxify.com/api/v1/mcp` as a developer-mode app in ChatGPT or as a Claude custom connector
2. Follow the OAuth authentication flow:
   - Sign in with **Google SSO**, **Apple SSO**, or **Email/OTP**
3. Once authenticated, start using the Faxify connector directly

**For clients that use this bridge (Cursor, Claude Desktop's config file, Continue.dev and other stdio clients):**

These clients authenticate with a JWT token:

1. Log in to [Faxify MCP](https://mcp.faxify.com)
2. Go to [Settings → MCP Configuration](https://mcp.faxify.com/en/settings)
3. Copy your JWT token
4. Add it to your MCP client configuration as `FAXIFY_JWT_TOKEN`

The token expires, and there is no refresh flow. When tool calls start returning "Authentication Failed", sign in to Settings again, copy the new token into `FAXIFY_JWT_TOKEN` and restart your client. Settings shows when the current token expires.

## How It Works

This wrapper script bridges two different transport mechanisms:

1. **stdio MCP clients** (Cursor, Claude Desktop's config file, Continue.dev, etc.) - Use stdio (stdin/stdout) for MCP communication
2. **Faxify MCP Server** - Runs as HTTP endpoint on Next.js/Vercel

The wrapper:

- Reads JSON-RPC requests from stdin (line-delimited JSON)
- Makes HTTP POST requests to the MCP server
- Writes responses back to stdout

## License

[MIT](LICENSE) © 2025 Const Agility, LLC
