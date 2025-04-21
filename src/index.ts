#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import {CallToolRequestSchema, ListToolsRequestSchema, Tool} from "@modelcontextprotocol/sdk/types.js";
import puppeteer from 'puppeteer-extra';
import type { Browser, Page } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import dotenv from "dotenv";
import * as cheerio from 'cheerio';

// @ts-ignore      <-- This line disables TS error here.
puppeteer.use(StealthPlugin());
dotenv.config();

class WebCrawler {
  // Core client properties
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "web-crawler-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Define available tools: tavily-search and tavily-extract
      const tools: Tool[] = [
        {
          name: "web-crawler",
          description: "A powerful web content crawler tool that retrieves and processes raw content from specified URL.",
          inputSchema: {
            type: "object",
            properties: {
              url: { 
                type: "string",
                description: "URL to extract content from"
              }
            },
            required: ["url"]
          }
        },
      ];
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        let response: string;
        const args = request.params.arguments ?? {};

        switch (request.params.name) {
          case "web-crawler":
            response = await this.extract({
              url: args.url
            });
            break;

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }

        return {
          content: [{
            type: "text",
            text: response
          }]
        };
      } catch (error: any) {
        throw error;
      }
    });
  }


  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Web Crawler MCP server running on stdio");
  }

  async extract(params: any): Promise<string> {
    try {
      const url = params.url;
      // @ts-ignore
      const browser: Browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page: Page = await browser.newPage();
    
      // Optionally set a realistic user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      );
    
      // Go to your target site
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });
    
      // Optionally wait for a specific selector to ensure content loads
      // await page.waitForSelector('article');
    
      // Extract the HTML
      const html: string = await page.content();
      console.log(html.substring(0, 500)); // Print first 500 chars
      // Load with Cheerio
      const $ = cheerio.load(html);
      $('script, style, nav, header, footer, aside, noscript').remove();

      let body = $('body');
      const content = this.extractContent(body, $)
      .replace(/\n{2,}/g, '\n\n')
      .trim();
    
      // Close the browser
      await browser.close();
      return content;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Recursive content extractor: preserves text, links, and images in Markdown style.
   */
  private extractContent(
    elem: cheerio.Cheerio,
    $: cheerio.Root
  ): string {
    let res = "";
    elem.contents().each((_: number, el: cheerio.Element) => {
      if (el.type === 'text') {
        res += (el.data || "").replace(/\s+/g, ' ');
      } else if (el.type === 'tag') {
        const tag = el.tagName?.toLowerCase?.() || el.name;
        const $el = $(el);
        if (tag === 'a') {
          const linkText = this.extractContent($el, $);
          const href = $el.attr('href');
          res += `[${linkText}](${href})`;
        } else if (tag === 'img') {
          const alt = $el.attr('alt') || '';
          const src = $el.attr('src') || '';
          res += `![${alt}](${src})`;
        } else if (['br', 'p', 'div', 'li'].includes(tag)) {
          res += '\n' + this.extractContent($el, $);
        } else {
          res += this.extractContent($el, $);
        }
      }
    });
    return res;
  }
}

export async function serve(): Promise<void> {
  const client = new WebCrawler();
  await client.run();
}

const server = new WebCrawler();
server.run().catch(console.error);