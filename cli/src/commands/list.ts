import { getAllLockEntries } from '../lockfile';
import { getSkillVersion } from '../api';

export interface ListOptions {
  agent?: string;
  global: boolean;
  checkUpdates?: boolean;
}

export async function listSkills(options: ListOptions): Promise<void> {
  const entries = getAllLockEntries(options.global);
  const slugs = Object.keys(entries);

  if (options.agent) {
    const filtered = slugs.filter(s => entries[s].agent === options.agent);
    if (filtered.length === 0) {
      console.log('No skills installed.');
      return;
    }
    printTable(filtered, entries, options.global);
  } else {
    if (slugs.length === 0) {
      console.log('No skills installed.');
      return;
    }
    printTable(slugs, entries, options.global);
  }
}

function printTable(slugs: string[], entries: ReturnType<typeof getAllLockEntries>, isGlobal: boolean): void {
  const scope = isGlobal ? '(global)' : '(project)';
  console.log(`\nInstalled skills ${scope}:\n`);
  console.log('  Name'.padEnd(32) + 'Version'.padEnd(12) + 'Agent'.padEnd(12) + 'Installed');
  console.log('  ' + '-'.repeat(68));
  for (const slug of slugs) {
    const e = entries[slug];
    const date = e.installedAt.slice(0, 10);
    console.log(`  ${slug.padEnd(30)} ${e.version.padEnd(11)} ${e.agent.padEnd(11)} ${date}`);
  }
  console.log('');
}
