import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Task } from '../tasks/task.model';

interface JwtClaims {
  sub: number;
  email: string;
  role: string;
  orgId: number;
  orgName: string | null;
  exp: number;
}

const TOKEN_KEY = 'auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<{ access_token: string }> {
    return this.http
      .post<{
        access_token: string;
      }>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((res) => localStorage.setItem(TOKEN_KEY, res.access_token)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    const claims = this.decode();
    if (!claims) return false;
    return claims.exp * 1000 > Date.now();
  }

  getRole(): string | null {
    return this.decode()?.role ?? null;
  }

  getCurrentUserId(): number | null {
    return this.decode()?.sub ?? null;
  }

  getOrgName(): string | null {
    return this.decode()?.orgName ?? null;
  }

  getEmail(): string | null {
    return this.decode()?.email ?? null;
  }

  canModify(task: Task): boolean {
    const role = this.getRole();
    if (
      role === 'Owner' ||
      role === 'Admin' ||
      task.createdById === this.getCurrentUserId()
    ) {
      return true;
    }
    return false;
  }

  private decode(): JwtClaims | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      return null;
    }
  }
}
