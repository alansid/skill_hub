import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface LockEntry {
  version: string;
  agent: string;
  installedAt: string;
  global: boolean;
  path: string;
}

export interface LockFile {
  skills: Record<string, LockEntry>;
}

function lockPath(global: boolean): string {
  const configPath = process.env['SKILLHUB_LOCK_PATH'];
  if (configPath) return configPath;
  return global
    ? join(homedir(), '.skillhub-lock.json')
    : join(process.cwd(), '.skillhub-lock.json');
}

export function readLock(global: boolean): LockFile {
  const path = lockPath(global);
  if (!existsSync(path)) return { skills: {} };
  try {
    return JSON.parse(require('fs').readFileSync(path, 'utf8')) as LockFile;
  } catch {
    return { skills: {} };
  }
}

export async function writeLock(global: boolean, lock: LockFile): Promise<void> {
  await writeFile(lockPath(global), JSON.stringify(lock, null, 2), 'utf8');
}

export async function addLockEntry(slug: string, entry: LockEntry, global: boolean): Promise<void> {
  const lock = readLock(global);
  lock.skills[slug] = entry;
  await writeLock(global, lock);
}

export async function removeLockEntry(slug: string, global: boolean): Promise<void> {
  const lock = readLock(global);
  delete lock.skills[slug];
  await writeLock(global, lock);
}

export function getLockEntry(slug: string, global: boolean): LockEntry | undefined {
  return readLock(global).skills[slug];
}

export function getAllLockEntries(global: boolean): Record<string, LockEntry> {
  return readLock(global).skills;
}
