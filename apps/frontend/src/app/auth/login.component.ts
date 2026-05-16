import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators, FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--mat-sys-surface);
    }
    .login-card {
      width: 100%;
      max-width: 400px;
      padding: 2.5rem;
      border-radius: 12px;
      box-shadow: var(--mat-sys-level2);
      background: var(--mat-sys-surface-container);
    }
    mat-form-field {
      width: 100%;
      display: block;
    }
  `],
  template: `
    <div class="login-card">
      <h1 class="text-2xl font-semibold mb-1" style="color: var(--mat-sys-on-surface)">TaskFlow</h1>
      <p class="text-sm mb-6" style="color: var(--mat-sys-on-surface-variant)">Sign in to your account</p>

      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" type="email" autocomplete="email" />
          @if (form.controls.email.invalid && form.controls.email.touched) {
            <mat-error>Enter a valid email</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Password</mat-label>
          <input matInput formControlName="password" type="password" autocomplete="current-password" />
          @if (form.controls.password.invalid && form.controls.password.touched) {
            <mat-error>Password is required</mat-error>
          }
        </mat-form-field>

        @if (error) {
          <p class="text-sm" style="color: var(--mat-sys-error)">{{ error }}</p>
        }

        <button mat-raised-button type="submit" [disabled]="loading" style="width: 100%; margin-top: 0.5rem;">
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  `,
})
export class LoginComponent {
  readonly form: FormGroup<{ email: FormControl<string>; password: FormControl<string> }>;
  loading = false;
  error: string | null = null;

  constructor(fb: NonNullableFormBuilder, private auth: AuthService, private router: Router) {
    this.form = fb.group({
      email: fb.control('', [Validators.required, Validators.email]),
      password: fb.control('', Validators.required),
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.error = null;
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigate(['/tasks']),
      error: () => {
        this.error = 'Invalid credentials. Please try again.';
        this.loading = false;
      },
    });
  }
}
