#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { z } from "zod";

const BASE_URL = "https://rubyui.com";

// All available RubyUI components
const COMPONENTS = [
  { name: "Accordion", slug: "accordion" },
  { name: "Alert", slug: "alert" },
  { name: "Alert Dialog", slug: "alert_dialog" },
  { name: "Aspect Ratio", slug: "aspect_ratio" },
  { name: "Avatar", slug: "avatar" },
  { name: "Badge", slug: "badge" },
  { name: "Breadcrumb", slug: "breadcrumb" },
  { name: "Button", slug: "button" },
  { name: "Calendar", slug: "calendar" },
  { name: "Card", slug: "card" },
  { name: "Carousel", slug: "carousel" },
  { name: "Checkbox", slug: "checkbox" },
  { name: "Checkbox Group", slug: "checkbox_group" },
  { name: "Clipboard", slug: "clipboard" },
  { name: "Codeblock", slug: "codeblock" },
  { name: "Collapsible", slug: "collapsible" },
  { name: "Combobox", slug: "combobox" },
  { name: "Command", slug: "command" },
  { name: "Context Menu", slug: "context_menu" },
  { name: "Date Picker", slug: "date_picker" },
  { name: "Dialog", slug: "dialog" },
  { name: "Dropdown Menu", slug: "dropdown_menu" },
  { name: "Form", slug: "form" },
  { name: "Hover Card", slug: "hover_card" },
  { name: "Input", slug: "input" },
  { name: "Link", slug: "link" },
  { name: "Masked Input", slug: "masked_input" },
  { name: "Pagination", slug: "pagination" },
  { name: "Popover", slug: "popover" },
  { name: "Progress", slug: "progress" },
  { name: "Radio Button", slug: "radio_button" },
  { name: "Select", slug: "select" },
  { name: "Separator", slug: "separator" },
  { name: "Sheet", slug: "sheet" },
  { name: "Shortcut Key", slug: "shortcut_key" },
  { name: "Sidebar", slug: "sidebar" },
  { name: "Skeleton", slug: "skeleton" },
  { name: "Switch", slug: "switch" },
  { name: "Table", slug: "table" },
  { name: "Tabs", slug: "tabs" },
  { name: "Textarea", slug: "textarea" },
  { name: "Theme Toggle", slug: "theme_toggle" },
  { name: "Tooltip", slug: "tooltip" },
  { name: "Typography", slug: "typography" },
];

// Simple in-memory cache: slug -> markdown content
const cache = new Map();

async function fetchPageAsMarkdown(url) {
  if (cache.has(url)) return cache.get(url);

  const res = await fetch(url, {
    headers: { "User-Agent": "rubyui-mcp/1.0" },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }

  const html = await res.text();
  const markdown = NodeHtmlMarkdown.translate(html);
  cache.set(url, markdown);
  return markdown;
}

function findComponent(query) {
  const q = query.toLowerCase().replace(/[\s_-]/g, "");
  return COMPONENTS.find(
    (c) =>
      c.slug.replace(/_/g, "") === q ||
      c.name.toLowerCase().replace(/[\s_-]/g, "") === q
  );
}

// ── Server setup ──────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "rubyui",
  version: "1.0.0",
});

// Tool: list_components
server.tool("list_components", "List all available RubyUI components", {}, async () => {
  const lines = COMPONENTS.map(
    (c) => `- **${c.name}** — ${BASE_URL}/docs/${c.slug}`
  );
  return {
    content: [
      {
        type: "text",
        text: `# RubyUI Components (${COMPONENTS.length} total)\n\n${lines.join("\n")}\n\nUse \`get_component_docs\` to fetch full documentation for any component.`,
      },
    ],
  };
});

// Tool: get_component_docs
server.tool(
  "get_component_docs",
  "Fetch full documentation and code examples for a specific RubyUI component",
  {
    component: z
      .string()
      .describe(
        'Component name or slug (e.g. "button", "dropdown_menu", "Alert Dialog")'
      ),
  },
  async ({ component }) => {
    const found = findComponent(component);
    if (!found) {
      const names = COMPONENTS.map((c) => c.name).join(", ");
      return {
        content: [
          {
            type: "text",
            text: `Component "${component}" not found.\n\nAvailable components: ${names}`,
          },
        ],
        isError: true,
      };
    }

    const url = `${BASE_URL}/docs/${found.slug}`;
    try {
      const markdown = await fetchPageAsMarkdown(url);
      return {
        content: [
          {
            type: "text",
            text: `# ${found.name}\n\nSource: ${url}\n\n${markdown}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Failed to fetch docs: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: get_installation_guide
server.tool(
  "get_installation_guide",
  "Get the RubyUI installation guide for Rails",
  {
    variant: z
      .enum(["bundler", "importmaps"])
      .optional()
      .describe(
        'Installation variant: "bundler" (JS Bundler/esbuild/vite) or "importmaps". Defaults to bundler.'
      ),
  },
  async ({ variant = "bundler" }) => {
    const slug =
      variant === "importmaps"
        ? "installation/rails_importmaps"
        : "installation/rails_bundler";
    const url = `${BASE_URL}/docs/${slug}`;
    try {
      const markdown = await fetchPageAsMarkdown(url);
      return {
        content: [{ type: "text", text: `# RubyUI Installation (${variant})\n\nSource: ${url}\n\n${markdown}` }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Failed to fetch guide: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: search_components
server.tool(
  "search_components",
  "Search for RubyUI components by name or keyword",
  {
    query: z.string().describe("Search term, e.g. 'menu', 'input', 'dialog'"),
  },
  async ({ query }) => {
    const q = query.toLowerCase();
    const matches = COMPONENTS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.slug.includes(q.replace(/\s+/g, "_"))
    );

    if (matches.length === 0) {
      return {
        content: [{ type: "text", text: `No components matched "${query}".` }],
      };
    }

    const lines = matches.map(
      (c) => `- **${c.name}** — \`get_component_docs("${c.slug}")\``
    );
    return {
      content: [
        {
          type: "text",
          text: `# Search results for "${query}"\n\n${lines.join("\n")}`,
        },
      ],
    };
  }
);

// Tool: get_theming_guide
server.tool(
  "get_theming_guide",
  "Get the RubyUI theming and dark mode documentation",
  {},
  async () => {
    const pages = [
      { label: "Theming", path: "docs/theming" },
      { label: "Dark Mode", path: "docs/dark_mode" },
      { label: "Customizing Components", path: "docs/customizing_components" },
    ];

    const results = await Promise.allSettled(
      pages.map(async (p) => {
        const url = `${BASE_URL}/${p.path}`;
        const md = await fetchPageAsMarkdown(url);
        return `## ${p.label}\n\nSource: ${url}\n\n${md}`;
      })
    );

    const text = results
      .map((r, i) =>
        r.status === "fulfilled"
          ? r.value
          : `## ${pages[i].label}\n\nFailed to fetch: ${r.reason?.message}`
      )
      .join("\n\n---\n\n");

    return {
      content: [{ type: "text", text: `# RubyUI Theming Guide\n\n${text}` }],
    };
  }
);

// ── Start ──────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
