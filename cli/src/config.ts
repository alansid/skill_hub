import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface SkillHubConfig {
  defaultAgent?: string;
}

export function getConfigPath(): string {
  return process.env['SKILLHUB_CONFIG_PATH'] ?? join(homedir(), '.skillhubrc.json');
}

export function readConfig(): SkillHubConfig {
  const p = getConfigPath();
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as SkillHubConfig;
  } catch {
    return {};
  }
}

export function writeConfig(config: SkillHubConfig): void {
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf8');
}

export function setConfigValue(key: string, value: string): void {
  if (key !== 'default-agent') throw new Error(`Unknown config key: ${key}`);
  const cfg = readConfig();
  cfg.defaultAgent = value;
  writeConfig(cfg);
  console.log(`Set ${key} = ${value}`);
}

export function getConfigValue(key: string): string | undefined {
  if (key !== 'default-agent') throw new Error(`Unknown config key: ${key}`);
  return readConfig().defaultAgent;
}
