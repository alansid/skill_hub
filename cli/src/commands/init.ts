import { mkdir, writeFile, access } from 'fs/promises';
import { join } from 'path';
import * as readline from 'readline';

export interface InitOptions {
  dir?: string;
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

export async function initSkill(name: string | undefined, options: InitOptions): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    const skillName = name ?? (await ask(rl, 'Skill name: ')).trim();
    if (!skillName) throw new Error('Name is required.');

    const autoSlug = toSlug(skillName);
    const slugInput = (await ask(rl, `Slug (auto: ${autoSlug}): `)).trim();
    const slug = slugInput || autoSlug;

    const description = (await ask(rl, 'Description (max 500): ')).trim() || 'No description';
    const versionInput = (await ask(rl, 'Version (default: 1.0.0): ')).trim();
    const version = versionInput || '1.0.0';
    const categorySlug = (await ask(rl, 'Category slug (e.g. testing, frontend, devops): ')).trim() || 'general';
    const toolsInput = (await ask(rl, 'Compatible tools (comma-separated, e.g. claude,copilot): ')).trim();
    const compatibleTools = toolsInput ? toolsInput.split(',').map(t => t.trim()).filter(Boolean) : ['claude'];
    const createRefs = (await ask(rl, 'Create references/ folder? (Y/n): ')).trim().toLowerCase();

    const targetDir = options.dir ?? slug;

    try {
      await access(targetDir);
      throw new Error(`Directory '${targetDir}' already exists. Use --dir to specify a different path.`);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }

    const toolsYaml = compatibleTools.map(t => `  - ${t}`).join('\n');
    const skillMdContent = `---
name: ${slug}
description: ${description}
version: ${version}
categorySlug: ${categorySlug}
compatibleTools:
${toolsYaml}
---

# ${skillName}

<!-- 說明此技能的目的與適用情境 -->

## When to Use

<!-- 描述應在什麼情況下啟動此技能 -->

## Instructions

<!-- 撰寫給 AI 的具體指令 -->
`;

    await mkdir(targetDir, { recursive: true });
    await writeFile(join(targetDir, 'SKILL.md'), skillMdContent, 'utf8');

    if (createRefs !== 'n') {
      await mkdir(join(targetDir, 'references'), { recursive: true });
      await writeFile(join(targetDir, 'references', '.gitkeep'), '', 'utf8');
    }

    console.log(`\n✓ Created ${targetDir}/SKILL.md`);
    if (createRefs !== 'n') console.log(`✓ Created ${targetDir}/references/`);
    console.log(`\nNext steps:`);
    console.log(`  1. Edit ${targetDir}/SKILL.md with your skill instructions`);
    console.log(`  2. skillhub push ./${targetDir} --token <your-token>`);
  } finally {
    rl.close();
  }
}
