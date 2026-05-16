import { Route } from '@angular/router';
import { authGuard, publicGuard } from './auth/auth.guard';

export const appRoutes: Route[] = [
  { path: '', redirectTo: 'tasks', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [publicGuard],
    loadComponent: () =>
      import('./auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'tasks',
        loadComponent: () =>
          import('./tasks/task-list.component').then(
            (m) => m.TaskListComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'tasks' },
];
