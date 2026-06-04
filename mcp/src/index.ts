#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { handleSearch } from './tools/search';
import { handleGetSkill } from './tools/get-skill';
import { handlePull } from './tools/pull';
import { handleCategories } from './tools/categories';

const server = new Server(
  { name: 'skillhub', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'skillhub_search',
      description: 'Search SkillHub for AI skills by keyword, category, tag, or sort order.',
      inputSchema: {
        type: 'object',
        properties: {
          q:        { type: 'string',  description: 'Search keyword' },
          category: { type: 'string',  description: 'Category slug filter' },
          tag:      { type: 'string',  description: 'Tag name filter' },
          sort:     { type: 'string',  enum: ['trending', 'latest', 'top'], description: 'Sort order (default: trending)' },
          pageSize: { type: 'number',  description: 'Number of results (default: 10)' },
        },
      },
    },
    {
      name: 'skillhub_get_skill',
      description: 'Get full details of a SkillHub skill including its SKILL.md content.',
      inputSchema: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Skill slug identifier' },
        },
        required: ['slug'],
      },
    },
    {
      name: 'skillhub_pull',
      description: 'Download and install a SkillHub skill to the local AI tool directory.',
      inputSchema: {
        type: 'object',
        properties: {
          slug:   { type: 'string',  description: 'Skill slug to install' },
          agent:  { type: 'string',  enum: ['claude', 'opencode', 'copilot', 'codex'], description: 'Target AI agent (default: claude)' },
          global: { type: 'boolean', description: 'Install to user global directory (default: false)' },
          force:  { type: 'boolean', description: 'Overwrite existing skill (default: false)' },
        },
        required: ['slug'],
      },
    },
    {
      name: 'skillhub_categories',
      description: 'List all available skill categories on SkillHub.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;

  let result: unknown;
  if (name === 'skillhub_search')     result = await handleSearch(args as Parameters<typeof handleSearch>[0]);
  else if (name === 'skillhub_get_skill') result = await handleGetSkill(args as { slug: string });
  else if (name === 'skillhub_pull')  result = await handlePull(args as unknown as Parameters<typeof handlePull>[0]);
  else if (name === 'skillhub_categories') result = await handleCategories({} as never);
  else throw new Error(`Unknown tool: ${name}`);

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
