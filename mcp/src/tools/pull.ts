import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import { getSkillDownload, recordInstall } from '../api';

type Agent = 'claude' | 'opencode' | 'copilot' | 'codex';

interface PullInput {
  slug: string;
  agent?: Agent;
  global?: boolean;
  force?: boolean;
}

interface PullResult {
  success: boolean;
  path: string;
  message: string;
}

function resolveInstallPath(slug: string, agent: Agent, isGlobal: boolean): string {
  const base = isGlobal ? homedir() : process.cwd();
  const paths: Record<Agent, string> = {
    claude:   join(base, '.claude',            'skills', slug, 'SKILL.md'),
    opencode: join(base, '.opencode',          'skills', slug, 'SKILL.md'),
    copilot:  join(base, '.github', 'copilot', 'skills', slug, 'SKILL.md'),
    codex:    join(base, '.codex',             'skills', slug, 'SKILL.md'),
  };
  return paths[agent];
}

export async function handlePull(input: PullInput): Promise<PullResult> {
  const agent  = input.agent  ?? 'claude';
  const isGlobal = input.global ?? false;
  const force  = input.force  ?? false;
  const installPath = resolveInstallPath(input.slug, agent, isGlobal);

  try {
    if (!force && existsSync(installPath)) {
      return { success: false, path: installPath, message: `Already installed at ${installPath}. Use force:true to overwrite.` };
    }
    const data = await getSkillDownload(input.slug);
    const installDir = dirname(installPath);
    await mkdir(installDir, { recursive: true });
    await writeFile(installPath, data.content, 'utf8');

    for (const file of data.files ?? []) {
      const filePath = join(installDir, file.path);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, file.content, 'utf8');
    }

    void recordInstall(input.slug);
    return { success: true, path: installPath, message: `Installed ${data.name} v${data.version} → ${installPath}` };
  } catch (err) {
    return { success: false, path: installPath, message: (err as Error).message };
  }
}
