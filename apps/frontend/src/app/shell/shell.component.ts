import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterModule, MatListModule, MatIconModule, MatButtonModule],
  template: `
    <div style="display: flex; height: 100vh; overflow: hidden;">
      <!-- Sidebar -->
      <aside style="width: 256px; display: flex; flex-direction: column; flex-shrink: 0; background: var(--mat-sys-surface-container); border-right: 1px solid var(--mat-sys-outline-variant);">
        <!-- App / Org header -->
        <div style="padding: 1.5rem 1rem 1rem;">
          <div style="font-size: 1.125rem; font-weight: 600; color: var(--mat-sys-on-surface)">TaskFlow</div>
          <div style="font-size: 0.875rem; color: var(--mat-sys-on-surface-variant)">{{ orgName }}</div>
        </div>

        <!-- Nav section label -->
        <div style="padding: 0.5rem 1rem; font-size: 0.75rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; color: var(--mat-sys-on-surface-variant)">Workspace</div>
        <mat-nav-list>
          <a mat-list-item routerLink="/tasks" routerLinkActive="active-nav">
            <mat-icon matListItemIcon>task</mat-icon>
            <span matListItemTitle>Tasks</span>
          </a>
        </mat-nav-list>

        <!-- User info footer -->
        <div style="margin-top: auto; padding: 1rem; border-top: 1px solid var(--mat-sys-outline-variant);">
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
            <div style="width: 2rem; height: 2rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.875rem; font-weight: 500; flex-shrink: 0; background: var(--mat-sys-primary); color: var(--mat-sys-on-primary)">
              {{ initials }}
            </div>
            <div style="display: flex; flex-direction: column; min-width: 0; overflow: hidden;">
              <span style="font-size: 0.875rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--mat-sys-on-surface)">{{ email }}</span>
              <span style="font-size: 0.75rem; color: var(--mat-sys-on-surface-variant)">{{ role }}</span>
            </div>
          </div>
          <button mat-stroked-button style="width: 100%;" (click)="logout()">
            <mat-icon>logout</mat-icon>
            Sign out
          </button>
        </div>
      </aside>

      <!-- Main content -->
      <main style="flex: 1; overflow: auto;">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .active-nav { background: var(--mat-sys-secondary-container); }
  `],
})
export class ShellComponent {
  orgName: string;
  email: string;
  role: string;
  initials: string;

  constructor(private auth: AuthService, private router: Router) {
    this.orgName = auth.getOrgName() ?? '';
    this.email = auth.getEmail() ?? '';
    this.role = auth.getRole() ?? '';
    this.initials = this.email.slice(0, 2).toUpperCase();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
