export interface CurrentUser {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  provider: 'LOCAL' | 'GITHUB';
}

export interface AuthResponse {
  token: string;
  user: CurrentUser;
}
