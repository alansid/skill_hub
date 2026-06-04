const BASE_URL = process.env['SKILLHUB_API_URL'] ?? 'http://localhost:8080';

export interface SkillSummary {
  slug: string;
  name: string;
  description: string;
  author: string;
  version: string;
  installCount: number;
  compatibleTools: string[];
}

export interface SkillDetail extends SkillSummary {
  content: string;
}

export interface SkillFileDto {
  path: string;
  content: string;
}

export interface SkillDownload {
  slug: string;
  name: string;
  version: string;
  content: string;
  files: SkillFileDto[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface SearchParams {
  q?: string;
  category?: string;
  tag?: string;
  sort?: string;
  pageSize?: number;
}

export async function searchSkills(params: SearchParams): Promise<{ skills: SkillSummary[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.q)        qs.set('q', params.q);
  if (params.category) qs.set('category', params.category);
  if (params.tag)      qs.set('tag', params.tag);
  if (params.sort)     qs.set('sort', params.sort);
  qs.set('pageSize', String(params.pageSize ?? 10));

  const res = await fetch(`${BASE_URL}/api/v1/skills?${qs}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json() as { skills: SkillSummary[]; total: number };
  return data;
}

export async function getSkillDetail(slug: string): Promise<SkillDetail> {
  const res = await fetch(`${BASE_URL}/api/v1/skills/${slug}`);
  if (res.status === 404) throw new Error(`Skill not found: ${slug}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<SkillDetail>;
}

export async function getSkillDownload(slug: string): Promise<SkillDownload> {
  const res = await fetch(`${BASE_URL}/api/v1/skills/${slug}/download`);
  if (res.status === 404) throw new Error(`Skill not found: ${slug}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<SkillDownload>;
}

export async function recordInstall(slug: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/v1/skills/${slug}/install`, { method: 'POST' });
  } catch {
    // fire-and-forget — ignore errors silently
  }
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${BASE_URL}/api/v1/skills/categories`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json() as { categories: Category[] };
  return data.categories;
}
