import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/marketplace/marketplace.component').then(m => m.MarketplaceComponent),
  },
  {
    path: 'skills/:slug',
    loadComponent: () =>
      import('./features/skill-detail/skill-detail.component').then(m => m.SkillDetailComponent),
  },
  {
    path: 'skills/:slug/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/skill-detail/edit/edit-skill.component').then(m => m.EditSkillComponent),
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/callback/callback.component').then(m => m.CallbackComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then(m => m.ProfileComponent),
  },
  {
    path: 'publish',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/publish/publish-skill.component').then(m => m.PublishSkillComponent),
  },
  { path: '**', redirectTo: '' },
];
