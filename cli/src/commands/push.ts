import { readFile, readdir, stat } from 'fs/promises';
import { join, relative, dirname } from 'path';
import { publishSkill, updateSkill, type PublishRequest } from '../api';

export interface PushOptions {
  token?: string;
  force?: boolean;
}

interface ParsedSkill {
  slug: string;
  name: string;
  description: string;
  version: string;
  categorySlug: string;
  compatibleTools: string[];
  content: string;
}

function parseSkillMd(raw: string): ParsedSkill {
  const cleaned = raw.replace(/^﻿/, '');  // strip BOM if present
  let frontmatter: Record<string, string | string[]> = {};
  let body = cleaned;
  const rawNoBom = cleaned;

  const fmMatch = rawNoBom.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (fmMatch) {
    body = fmMatch[2].trim();
    const lines = fmMatch[1].split('\n');
    let currentKey = '';
    const listValues: string[] = [];
    let inList = false;

    for (const line of lines) {
      const kvMatch = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$/);
      if (kvMatch) {
        if (inList && currentKey) frontmatter[currentKey] = [...listValues];
        inList = false;
        listValues.length = 0;
        currentKey = kvMatch[1];
        const val = kvMatch[2].trim();
        if (val) frontmatter[currentKey] = val;
        else inList = true;
      } else if (inList && line.match(/^\s+-\s+(.+)$/)) {
        listValues.push(line.match(/^\s+-\s+(.+)$/)![1]);
      }
    }
    if (inList && currentKey) frontmatter[currentKey] = [...listValues];
  }

  const titleMatch = body.match(/^#\s+(.+)/m);
  const name = (frontmatter['name'] as string) || titleMatch?.[1] || '';
  const slug = (frontmatter['slug'] as string) || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const version = (frontmatter['version'] as string) || '1.0.0';
  const description = (frontmatter['description'] as string) || body.split('\n').filter(l => l && !l.startsWith('#'))[0] || '';
  const categorySlug = (frontmatter['category'] as string) || 'general';
  const rawTools = frontmatter['compatibleTools'];
  const compatibleTools: string[] = Array.isArray(rawTools) ? rawTools : rawTools ? [rawTools] : ['claude'];

  if (!name) throw new Error('Could not parse skill name from SKILL.md. Add a frontmatter "name:" field or a # heading.');

  return { slug, name, description, version, categorySlug, compatibleTools, content: raw };
}

async function collectBundleFiles(skillDir: string, skillMdPath: string): Promise<{ path: string; content: string }[]> {
  const files: { path: string; content: string }[] = [];
  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md') && fullPath !== skillMdPath) {
        const content = await readFile(fullPath, 'utf8');
        const relPath = relative(skillDir, fullPath).replace(/\\/g, '/');
        files.push({ path: relPath, content });
      }
    }
  }
  await walk(skillDir);
  return files;
}

export async function pushSkill(path: string, options: PushOptions): Promise<void> {
  const token = options.token ?? process.env['SKILLHUB_TOKEN'];
  if (!token) throw new Error('No auth token. Set SKILLHUB_TOKEN or pass --token <token>.');

  const s = await stat(path);
  const isDir = s.isDirectory();
  const filePath = isDir ? join(path, 'SKILL.md') : path;
  const skillDir = isDir ? path : dirname(path);
  const raw = await readFile(filePath, 'utf8');
  const parsed = parseSkillMd(raw);

  const bundleFiles = await collectBundleFiles(skillDir, filePath);

  const req: PublishRequest = {
    slug:            parsed.slug,
    name:            parsed.name,
    description:     parsed.description,
    version:         parsed.version,
    categorySlug:    parsed.categorySlug,
    tagSlugs:        [],
    compatibleTools: parsed.compatibleTools,
    content:         parsed.content,
    files:           bundleFiles,
  };

  try {
    if (options.force) {
      const upd = await updateSkill(parsed.slug, {
        name: req.name,
        version: req.version,
        description: req.description,
        categorySlug: req.categorySlug,
        compatibleTools: req.compatibleTools,
        content: req.content,
      }, token);
      console.log(`✓ Updated ${upd.slug} → v${upd.version}`);
    } else {
      const res = await publishSkill(req, token);
      const statusNote = (res as { status?: string }).status === 'PENDING'
        ? ' (pending review — auto-approved within 24h)'
        : '';
      console.log(`✓ Published ${res.slug} v${res.version}${statusNote}`);
    }
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e.status === 409) {
      console.error(`Slug '${req.slug}' already exists. Use --force to overwrite.`);
      throw new Error('Slug already exists');
    }
    if (e.status === 403) {
      console.error('Not the author. Only the original author can update this skill.');
      throw new Error('Forbidden');
    }
    if (e.status === 401) {
      console.error('Authentication failed. Check your token.');
      throw new Error('Unauthorized');
    }
    if (e.status === 404) {
      console.error(`Category '${req.categorySlug}' not found. Check the category field in your SKILL.md frontmatter.`);
      throw new Error(`Category not found: ${req.categorySlug}`);
    }
    if (e.status === 422) {
      console.error('Content rejected by safety scanner. Check your SKILL.md for dangerous commands.');
      throw new Error('Content rejected');
    }
    if (e.status === 400) {
      console.error('Validation error. Check your SKILL.md fields.');
      throw new Error('Validation error');
    }
    throw new Error(`API error: ${e.status ?? 'unknown'}`);
  }
}
