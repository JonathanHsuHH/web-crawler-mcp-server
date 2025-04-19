# Web Crawler MCP Server

A Model Context Protocol (MCP) server that provides a web crawling and content extraction tool for AI assistants such as Claude Desktop, Cursor, and other MCP-compatible clients.

## Features

- Extracts and cleans main text content from any public web page.
- Uses Puppeteer with stealth plugin to bypass anti-bot protections.
- Returns readable, whitespace-normalized text for LLM consumption.
- Easy integration with Claude Desktop and other MCP clients.

## Prerequisites

- Node.js (v16 or higher)
- MCP-compatible client (e.g., Claude Desktop, Cursor)
- (Optional) [Puppeteer dependencies](https://pptr.dev/guides/docker) for some Linux environments

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the server:
   ```bash
   npm run build
   ```

## Usage

You can run the server directly:
```bash
node build/index.js
```

Or configure it as an MCP server in your client (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "web-crawler-mcp": {
      "command": "node",
      "args": ["<absolute-path-to>/server/web_crawler/build/index.js"]
    }
  }
}
```

### Available Tool

**web-crawler**

- **Description:** Extracts and returns the cleaned text content from a specified URL.
- **Input:**
  - `url` (string, required): The URL to extract content from.

#### Example

```json
{
  "tool_name": "web-crawler",
  "arguments": {
    "url": "https://openai.com/news"
  }
}
```

## Development

- `npm run build` — Compile TypeScript to JavaScript.
- `npm run watch` — Watch and rebuild on changes.
- `npm run inspector` — Launch MCP Inspector for debugging.

## Notes

- The server launches a real browser instance (`headless: false`) for best compatibility.
- Output is plain text, suitable for LLM input.
- For advanced parsing, modify the Cheerio logic in `src/index.ts`.

## License

MIT