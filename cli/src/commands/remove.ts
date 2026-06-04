import { rm } from 'fs/promises';
import { dirname } from 'path';
import { getLockEntry, removeLockEntry } from '../lockfile';

export interface RemoveOptions {
  agent?: string;
  global: boolean;
}

export async function removeSkill(slug: string, options: RemoveOptions): Promise<void> {
  const entry = getLockEntry(slug, options.global);
  if (!entry) {
    console.error(`${slug} is not installed.`);
    process.exitCode = 1;
    return;
  }

  // Remove the skill directory (SKILL.md's parent = skill slug dir)
  const skillDir = dirname(entry.path);
  try {
    await rm(skillDir, { recursive: true, force: true });
    await removeLockEntry(slug, options.global);
    console.log(`✓ Removed ${slug} from ${skillDir}`);
  } catch (err) {
    console.error(`Failed to remove ${slug}: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}
