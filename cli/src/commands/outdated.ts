import { getAllLockEntries } from '../lockfile';
import { getSkillVersion } from '../api';

export interface OutdatedOptions {
  agent?: string;
  global: boolean;
}

export async function checkOutdated(options: OutdatedOptions): Promise<void> {
  const entries = getAllLockEntries(options.global);
  let slugs = Object.keys(entries);

  if (options.agent) {
    slugs = slugs.filter(s => entries[s].agent === options.agent);
  }

  if (slugs.length === 0) {
    console.log('No skills installed.');
    return;
  }

  const outdated: { slug: string; current: string; latest: string }[] = [];

  for (const slug of slugs) {
    const latest = await getSkillVersion(slug);
    if (latest && latest !== entries[slug].version) {
      outdated.push({ slug, current: entries[slug].version, latest });
    }
  }

  if (outdated.length === 0) {
    console.log('All skills are up to date.');
    return;
  }

  console.log('\nOutdated skills:\n');
  console.log('  Name'.padEnd(32) + 'Current'.padEnd(12) + 'Latest');
  console.log('  ' + '-'.repeat(56));
  for (const { slug, current, latest } of outdated) {
    console.log(`  ${slug.padEnd(30)} ${current.padEnd(11)} → ${latest}   (update available)`);
  }
  console.log('');
}
