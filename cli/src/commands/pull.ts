import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fetchSkillDownload, recordInstall } from '../api';
import { readConfig } from '../config';
import { addLockEntry } from '../lockfile';

export type Agent = 'claude' | 'copilot' | 'codex' | 'opencode';

export interface PullOptions {
  agent: Agent;
  global: boolean;
  dryRun: boolean;
  force: boolean;
  confirm?: (message: string) => Promise<boolean>;
}

export interface MultiPullOptions {
  agents: Agent[];
  global: boolean;
  dryRun: boolean;
  force: boolean;
  confirm?: (message: string) => Promise<boolean>;
}

export interface MultiPullResult {
  succeeded: Agent[];
  failed: { agent: Agent; error: string }[];
}

export function resolveInstallPath(slug: string, agent: Agent, isGlobal: boolean): string {
  const base = isGlobal ? homedir() : process.cwd();
  const agentPaths: Record<Agent, string> = {
    claude:   join(base, '.claude',             'skills', slug, 'SKILL.md'),
    copilot:  join(base, '.github', 'copilot',  'skills', slug, 'SKILL.md'),
    codex:    join(base, '.codex',              'skills', slug, 'SKILL.md'),
    opencode: join(base, '.opencode',           'skills', slug, 'SKILL.md'),
  };
  return agentPaths[agent];
}

export async function pullSkill(slug: string, options: PullOptions): Promise<void> {
  const { agent, global: isGlobal, dryRun, force, confirm } = options;
  const installPath = resolveInstallPath(slug, agent, isGlobal);

  if (dryRun) {
    console.log(`Dry run — would install to: ${installPath}`);
    return;
  }

  if (!force && existsSync(installPath)) {
    const ok = await (confirm ?? defaultConfirm)(`${installPath} already exists. Overwrite?`);
    if (!ok) {
      console.log('Cancelled.');
      return;
    }
  }

  const data = await fetchSkillDownload(slug);
  const installDir = dirname(installPath);
  await mkdir(installDir, { recursive: true });
  await writeFile(installPath, data.content, 'utf8');

  for (const file of data.files ?? []) {
    const filePath = join(installDir, file.path);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, file.content, 'utf8');
  }

  console.log(`Installed ${data.name} v${data.version} → ${installPath}`);
  void recordInstall(slug);
  void addLockEntry(slug, {
    version: data.version,
    agent,
    installedAt: new Date().toISOString(),
    global: isGlobal,
    path: installPath,
  }, isGlobal);
}

export async function pullSkillMulti(slug: string, options: MultiPullOptions): Promise<MultiPullResult> {
  let agents = options.agents;

  if (agents.length === 0) {
    const defaultAgent = readConfig().defaultAgent ?? 'claude';
    agents = [defaultAgent as Agent];
  }

  const result: MultiPullResult = { succeeded: [], failed: [] };

  for (const agent of agents) {
    try {
      await pullSkill(slug, { ...options, agent });
      result.succeeded.push(agent);
    } catch (err) {
      result.failed.push({ agent, error: (err as Error).message });
      console.error(`[${agent}] ${(err as Error).message}`);
    }
  }

  return result;
}

async function defaultConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${message} (y/N) `, (answer: string) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}
