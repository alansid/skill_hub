export interface SkillDownloadResponse {
  slug: string;
  name: string;
  version: string;
  content: string;
  files: SkillFileDto[];
}

const BASE_URL = process.env['SKILLHUB_API_URL'] ?? 'http://localhost:8080';

export async function fetchSkillDownload(slug: string): Promise<SkillDownloadResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/skills/${slug}/download`);
  if (res.status === 404) {
    throw new Error(`Skill '${slug}' not found`);
  }
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json() as Promise<SkillDownloadResponse>;
}

export interface SkillFileInput {
  path: string;
  content: string;
}

export interface PublishRequest {
  slug: string;
  name: string;
  description: string;
  version: string;
  categorySlug: string;
  tagSlugs: string[];
  compatibleTools: string[];
  content: string;
  files?: SkillFileInput[];
}

export interface SkillFileDto {
  path: string;
  content: string;
}

export interface PublishResponse {
  slug: string;
  name: string;
  version: string;
  author: string;
}

export interface UpdateRequest {
  name: string;
  version: string;
  description?: string;
  categorySlug?: string;
  tagSlugs?: string[];
  compatibleTools?: string[];
  content?: string;
}

export async function updateSkill(slug: string, req: UpdateRequest, token: string): Promise<PublishResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/skills/${slug}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err: { status: number } = { status: res.status };
    throw err;
  }
  return res.json() as Promise<PublishResponse>;
}

export async function getSkillVersion(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/skills/${slug}`);
    if (!res.ok) return null;
    const data = await res.json() as { version: string };
    return data.version;
  } catch {
    return null;
  }
}

export async function recordInstall(slug: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/v1/skills/${slug}/install`, { method: 'POST' });
  } catch {
    // fire-and-forget — ignore errors silently
  }
}

export async function publishSkill(req: PublishRequest, token: string): Promise<PublishResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/skills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err: { status: number } = { status: res.status };
    throw err;
  }
  return res.json() as Promise<PublishResponse>;
}
