# rubyui-mcp

An MCP (Model Context Protocol) server that provides AI assistants with access to [RubyUI](https://rubyui.com) component library documentation.

## Tools

| Tool | Description |
|------|-------------|
| `list_components` | List all available RubyUI components |
| `get_component_docs` | Fetch full docs and code examples for a specific component |
| `search_components` | Search components by name or keyword |
| `get_installation_guide` | Get the Rails installation guide (bundler or importmaps) |
| `get_theming_guide` | Get theming, dark mode, and customization docs |

## Setup

```bash
npm install
```

## Usage

### With Claude Code

Add to your Claude Code MCP config (`~/.claude/settings.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "rubyui": {
      "command": "node",
      "args": ["/path/to/rubyui-mcp/index.js"]
    }
  }
}
```

### Standalone

```bash
npm start
```

The server communicates over stdio using the MCP protocol.

## Requirements

- Node.js >= 18.0.0
