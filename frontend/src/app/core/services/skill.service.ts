import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CategoryModel,
  CollectionWithSkills,
  PagedSkillsResponse,
  SkillDetail,
  SkillQueryParams,
  SkillSummary,
  SkillVersionDto,
  TagModel,
} from '../../shared/models/skill.model';

@Injectable({ providedIn: 'root' })
export class SkillService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1';

  getSkills(params: SkillQueryParams = {}): Observable<PagedSkillsResponse> {
    let httpParams = new HttpParams();
    if (params.sort)     httpParams = httpParams.set('sort', params.sort);
    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.tag)      httpParams = httpParams.set('tag', params.tag);
    if (params.q)        httpParams = httpParams.set('q', params.q);
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
    return this.http.get<PagedSkillsResponse>(`${this.base}/skills`, { params: httpParams });
  }

  getCategories(): Observable<{ categories: CategoryModel[] }> {
    return this.http.get<{ categories: CategoryModel[] }>(`${this.base}/skills/categories`);
  }

  getTags(): Observable<{ tags: TagModel[] }> {
    return this.http.get<{ tags: TagModel[] }>(`${this.base}/skills/tags`);
  }

  getCollections(): Observable<{ collections: CollectionWithSkills[] }> {
    return this.http.get<{ collections: CollectionWithSkills[] }>(`${this.base}/collections`);
  }

  getSkillDetail(slug: string): Observable<SkillDetail> {
    return this.http.get<SkillDetail>(`${this.base}/skills/${slug}`);
  }

  getRelatedSkills(slug: string): Observable<{ skills: SkillSummary[] }> {
    return this.http.get<{ skills: SkillSummary[] }>(`${this.base}/skills/${slug}/related`);
  }

  publishSkill(req: {
    slug: string; name: string; description: string; version: string;
    categorySlug: string; tagSlugs: string[]; compatibleTools: string[]; content: string;
  }): Observable<{ slug: string; name: string; version: string; author: string; status: string }> {
    return this.http.post<{ slug: string; name: string; version: string; author: string; status: string }>(
      `${this.base}/skills`, req
    );
  }

  getSkillDownload(slug: string): Observable<{ content: string; files: { path: string; content: string }[] }> {
    return this.http.get<{ content: string; files: { path: string; content: string }[] }>(
      `${this.base}/skills/${slug}/download`
    );
  }

  reportSkill(slug: string, reason: string): Observable<{ reported: boolean }> {
    return this.http.post<{ reported: boolean }>(`${this.base}/skills/${slug}/report`, { reason });
  }

  updateSkill(slug: string, req: {
    name: string; version: string; description?: string;
    categorySlug?: string; compatibleTools?: string[]; content?: string;
  }): Observable<SkillDetail> {
    return this.http.put<SkillDetail>(`${this.base}/skills/${slug}`, req);
  }

  deleteSkill(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/skills/${slug}`);
  }

  getVersionHistory(slug: string): Observable<{ versions: SkillVersionDto[] }> {
    return this.http.get<{ versions: SkillVersionDto[] }>(`${this.base}/skills/${slug}/versions`);
  }
}
