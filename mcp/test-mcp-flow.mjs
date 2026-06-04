// End-to-end MCP flow test: search → get_skill → pull
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { mkdtemp, rm } from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runTool(client, name, args) {
  console.log(`\n→ ${name}`, JSON.stringify(args));
  const res = await client.callTool({ name, arguments: args });
  const text = res.content[0].text;
  const parsed = JSON.parse(text);
  console.log('←', JSON.stringify(parsed, null, 2).slice(0, 600));
  return parsed;
}

async function main() {
  const tempDir = await mkdtemp(join(tmpdir(), 'skillhub-mcp-test-'));
  console.log('Temp install dir:', tempDir);

  const transport = new StdioClientTransport({
    command: 'node',
    args: [join(__dirname, 'dist/index.js')],
    env: { ...process.env, SKILLHUB_API_URL: 'http://localhost:8080' },
  });

  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  // 1. List tools
  const { tools } = await client.listTools();
  console.log('\n[Tools available]:', tools.map(t => t.name).join(', '));

  // 2. Search for the test skill
  const searchResult = await runTool(client, 'skillhub_search', { q: 'hello world', pageSize: 3 });
  const found = searchResult.skills?.find(s => s.slug === 'hello-world-skill');
  if (!found) throw new Error('Test skill not found in search results!');
  console.log('\n✓ skillhub_search found the skill');

  // 3. Get full skill details (including SKILL.md content)
  const detail = await runTool(client, 'skillhub_get_skill', { slug: 'hello-world-skill' });
  if (!detail.content) throw new Error('No content returned!');
  console.log('\n✓ skillhub_get_skill returned content:', detail.content.slice(0, 80) + '...');

  // 4. List categories
  const cats = await runTool(client, 'skillhub_categories', {});
  console.log('\n✓ skillhub_categories returned', cats.categories?.length, 'categories');

  // 5. Pull skill to temp dir
  process.chdir(tempDir);
  const pullResult = await runTool(client, 'skillhub_pull', {
    slug: 'hello-world-skill',
    agent: 'claude',
    force: true,
  });
  console.log('\n✓ skillhub_pull result:', pullResult);

  // 6. Verify file written at path reported by pull tool
  const installedPath = pullResult.path;
  if (!existsSync(installedPath)) throw new Error(`SKILL.md not written at: ${installedPath}`);
  const written = readFileSync(installedPath, 'utf8');
  console.log('\n✓ SKILL.md installed at:', installedPath);
  console.log('  Content preview:', written.slice(0, 100));

  await client.close();
  await rm(tempDir, { recursive: true, force: true });

  console.log('\n\n✅ All MCP tools verified successfully!');
}

main().catch(e => { console.error('\n❌ Error:', e.message); process.exit(1); });
