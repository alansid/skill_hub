#!/usr/bin/env node
import { Command } from 'commander';
import { pullSkillMulti, type Agent } from './commands/pull';
import { pushSkill } from './commands/push';
import { initSkill } from './commands/init';
import { listSkills } from './commands/list';
import { checkOutdated } from './commands/outdated';
import { updateSkills } from './commands/update';
import { removeSkill } from './commands/remove';
import { setConfigValue, getConfigValue } from './config';

const program = new Command();

program
  .name('skillhub')
  .description('SkillHub CLI')
  .version('0.1.0');

program
  .command('pull <slug>')
  .description('Pull a skill from SkillHub to local AI tool directory')
  .option('--agent <agent>', 'target agent (use multiple times or comma-separate)', (v, prev: string[]) => [...(prev || []), v], [] as string[])
  .option('--global', 'install to user global directory', false)
  .option('--dry-run', 'preview install path without writing', false)
  .option('--force', 'overwrite existing skill without confirmation', false)
  .action(async (slug: string, options: { agent: string[]; global: boolean; dryRun: boolean; force: boolean }) => {
    const agents = options.agent.length > 0
      ? (options.agent.flatMap(a => a.split(',').map(t => t.trim())) as Agent[])
      : [];

    const result = await pullSkillMulti(slug, { ...options, agents });

    if (result.failed.length > 0) {
      console.error(`\n${result.failed.length} agent(s) failed.`);
      process.exitCode = 1;
    }
  });

program
  .command('push <path>')
  .description('Publish a local SKILL.md to SkillHub')
  .option('--token <token>', 'Auth token (or set SKILLHUB_TOKEN env var)')
  .option('--force', 'Overwrite existing slug (Phase 7)', false)
  .action(async (path: string, options: { token?: string; force: boolean }) => {
    try {
      await pushSkill(path, { token: options.token, force: options.force });
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command('init [name]')
  .description('Scaffold a new skill directory with SKILL.md template')
  .option('--dir <path>', 'output directory (default: slug name)')
  .action(async (name: string | undefined, options: { dir?: string }) => {
    try {
      await initSkill(name, options);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command('list')
  .description('List locally installed skills')
  .option('--agent <agent>', 'filter by agent')
  .option('--global', 'list from global directory', false)
  .action(async (options: { agent?: string; global: boolean }) => {
    await listSkills(options);
  });

program
  .command('outdated')
  .description('Show skills with available updates')
  .option('--agent <agent>', 'filter by agent')
  .option('--global', 'check global directory', false)
  .action(async (options: { agent?: string; global: boolean }) => {
    await checkOutdated(options);
  });

program
  .command('update [slug]')
  .description('Update installed skill(s) to latest version')
  .option('--agent <agent>', 'target agent')
  .option('--global', 'update in global directory', false)
  .option('--all', 'update all installed skills', false)
  .action(async (slug: string | undefined, options: { agent?: string; global: boolean; all: boolean }) => {
    try {
      await updateSkills(slug, options);
    } catch (err) {
      console.error((err as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command('remove <slug>')
  .description('Remove an installed skill')
  .option('--agent <agent>', 'target agent')
  .option('--global', 'remove from global directory', false)
  .action(async (slug: string, options: { agent?: string; global: boolean }) => {
    await removeSkill(slug, options);
  });

const configCmd = program.command('config').description('Manage SkillHub CLI configuration');

configCmd
  .command('set <key> <value>')
  .description('Set a config value (e.g. default-agent claude)')
  .action((key: string, value: string) => {
    try {
      setConfigValue(key, value);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

configCmd
  .command('get <key>')
  .description('Get a config value (e.g. default-agent)')
  .action((key: string) => {
    try {
      const val = getConfigValue(key);
      console.log(val ?? '(not set)');
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

program.parse();
