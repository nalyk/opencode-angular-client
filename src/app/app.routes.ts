import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'session/:id',
    loadComponent: () => import('./components/session-detail/session-detail.component').then(m => m.SessionDetailComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./components/settings/settings.component').then(m => m.SettingsComponent)
  },
  {
    path: 'server-config',
    loadComponent: () => import('./components/server-config/server-config.component').then(m => m.ServerConfigComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
