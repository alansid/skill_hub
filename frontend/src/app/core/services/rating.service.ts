import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RatingDto, RatingsPageResponse } from '../../shared/models/skill.model';

@Injectable({ providedIn: 'root' })
export class RatingService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1';

  getRatings(slug: string, page = 0, pageSize = 10): Observable<RatingsPageResponse> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<RatingsPageResponse>(`${this.base}/skills/${slug}/ratings`, { params });
  }

  submitRating(slug: string, rating: number, comment?: string): Observable<RatingDto> {
    return this.http.post<RatingDto>(`${this.base}/skills/${slug}/ratings`, { rating, comment });
  }

  updateRating(slug: string, rating: number, comment?: string): Observable<RatingDto> {
    return this.http.put<RatingDto>(`${this.base}/skills/${slug}/ratings/me`, { rating, comment });
  }

  deleteRating(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/skills/${slug}/ratings/me`);
  }
}
