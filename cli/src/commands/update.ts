import { getAllLockEntries, getLockEntry } from '../lockfile';
import { getSkillVersion } from '../api';
import { pullSkill, type Agent } from './pull';

export interface UpdateOptions {
  agent?: string;
  global: boolean;
  all?: boolean;
}

export async function updateSkills(slug: string | undefined, options: UpdateOptions): Promise<void> {
  if (!slug && !options.all) {
    console.error('Specify a skill slug or use --all to update all installed skills.');
    process.exitCode = 1;
    return;
  }

  if (options.all) {
    const entries = getAllLockEntries(options.global);
    const slugs = Object.keys(entries);
    if (slugs.length === 0) {
      console.log('No skills installed.');
      return;
    }
    let failed = 0;
    for (const s of slugs) {
      const entry = entries[s];
      try {
        await pullSkill(s, { agent: entry.agent as Agent, global: entry.global, dryRun: false, force: true });
      } catch {
        failed++;
      }
    }
    if (failed > 0) {
      console.error(`${failed} skill(s) failed to update.`);
      process.exitCode = 1;
    }
    return;
  }

  const entry = getLockEntry(slug!, options.global);
  if (!entry) {
    console.error(`${slug} is not installed. Run 'skillhub pull ${slug}' first.`);
    process.exitCode = 1;
    return;
  }

  const latest = await getSkillVersion(slug!);
  if (!latest) {
    console.error(`Could not fetch latest version for '${slug}'.`);
    process.exitCode = 1;
    return;
  }

  if (latest === entry.version) {
    console.log(`${slug} is already at the latest version (${latest}).`);
    return;
  }

  await pullSkill(slug!, {
    agent: (options.agent ?? entry.agent) as Agent,
    global: options.global,
    dryRun: false,
    force: true,
  });
}
