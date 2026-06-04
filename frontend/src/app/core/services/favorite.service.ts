import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SkillSummary } from '../../shared/models/skill.model';

const BASE = '/api/v1/users/me/favorites';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private http = inject(HttpClient);
  private _ids = signal<Set<string>>(new Set());

  isFavorited(skillId: string): boolean {
    return this._ids().has(skillId);
  }

  loadFavorites(): void {
    this.http.get<{ skills: SkillSummary[] }>(BASE).subscribe({
      next: r => this._ids.set(new Set(r.skills.map(s => s.id))),
      error: () => {},
    });
  }

  getFavorites(): Observable<{ skills: SkillSummary[] }> {
    return this.http.get<{ skills: SkillSummary[] }>(BASE);
  }

  addFavorite(skillId: string): Observable<{ favorited: boolean }> {
    this._ids.update(s => new Set([...s, skillId]));
    return this.http.post<{ favorited: boolean }>(`${BASE}/${skillId}`, {}).pipe(
      tap({ error: () => this._ids.update(s => { const n = new Set(s); n.delete(skillId); return n; }) })
    );
  }

  removeFavorite(skillId: string): Observable<{ favorited: boolean }> {
    this._ids.update(s => { const n = new Set(s); n.delete(skillId); return n; });
    return this.http.delete<{ favorited: boolean }>(`${BASE}/${skillId}`).pipe(
      tap({ error: () => this._ids.update(s => new Set([...s, skillId])) })
    );
  }
}
