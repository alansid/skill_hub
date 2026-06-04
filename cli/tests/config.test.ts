import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';

// 用 env var 把 config 路徑指向 temp dir
let tempDir: string;
let configPath: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'skillhub-cfg-'));
  configPath = join(tempDir, '.skillhubrc.json');
  process.env['SKILLHUB_CONFIG_PATH'] = configPath;
});

afterEach(async () => {
  delete process.env['SKILLHUB_CONFIG_PATH'];
  await rm(tempDir, { recursive: true, force: true });
});

import { readConfig, writeConfig, setConfigValue, getConfigValue } from '../src/config';

describe('config', () => {
  // Scenario: 設定預設 agent
  it('setConfigValue writes defaultAgent to config file', () => {
    setConfigValue('default-agent', 'opencode');
    const cfg = readConfig();
    expect(cfg.defaultAgent).toBe('opencode');
  });

  // Scenario: getConfigValue reads defaultAgent
  it('getConfigValue returns stored defaultAgent', () => {
    writeConfig({ defaultAgent: 'copilot' });
    expect(getConfigValue('default-agent')).toBe('copilot');
  });

  it('getConfigValue returns undefined when not set', () => {
    expect(getConfigValue('default-agent')).toBeUndefined();
  });

  it('readConfig returns empty object when file missing', () => {
    expect(readConfig()).toEqual({});
  });
});
