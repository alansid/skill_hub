export interface CategoryModel {
  id: string;
  name: string;
  slug: string;
}

export interface TagModel {
  id: string;
  name: string;
  type: string;
}

export type SkillStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface SkillSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CategoryModel;
  tags: TagModel[];
  author: string;
  version: string;
  installCount: number;
  compatibleTools: string[];
  createdAt: string;
  status: SkillStatus;
  avgRating: number;
  ratingCount: number;
}

export interface CollectionWithSkills {
  id: string;
  name: string;
  description: string;
  skills: SkillSummary[];
}

export interface PagedSkillsResponse {
  skills: SkillSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SkillDetail extends SkillSummary {
  authorId: string | null;
  installs24h: number;
  content: string;
  updatedAt: string | null;
  status: SkillStatus;
}

export interface SkillVersionDto {
  id: string;
  version: string;
  createdAt: string;
  createdBy: string;
}

export interface RatingDto {
  id: string;
  userId: string;
  displayName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface RatingsPageResponse {
  ratings: RatingDto[];
  total: number;
  page: number;
  pageSize: number;
  avgRating: number;
  ratingCount: number;
  distribution: Record<number, number>;
}

export interface SkillQueryParams {
  sort?: 'trending' | 'latest' | 'top';
  category?: string;
  tag?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}
