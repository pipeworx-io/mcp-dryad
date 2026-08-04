# mcp-dryad

Dryad (datadryad.org) MCP — keyless.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_datasets` | Search Dryad, a curated repository of open research datasets (mostly the data underlying published, peer-reviewed studies in any field of science). Full-text query over titles, abstracts, authors and keywords. Returns matching datasets with DOI, title, authors, truncated abstract, keywords, publication date, field of science and license. Keyless. |
| `get_dataset` | Fetch a single Dryad dataset by its DOI (e.g. "doi:10.5061/dryad.hx3ffbgjj" or "10.5061/dryad.hx3ffbgjj"). Returns full metadata — title, authors, abstract, keywords, publication date, field of science, license, version — plus a download URL for the dataset files. Keyless. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "dryad": {
      "url": "https://gateway.pipeworx.io/dryad/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Dryad data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
