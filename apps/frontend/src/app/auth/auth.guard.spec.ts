import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

const mockRouter = { createUrlTree: vi.fn((path: string[]) => path as unknown as UrlTree) };
const mockAuth = { isLoggedIn: vi.fn() };

describe('authGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuth },
      ],
    });
  });

  afterEach(() => localStorage.clear());

  it('returns true when user is logged in', () => {
    mockAuth.isLoggedIn.mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('redirects to /login when no token', () => {
    mockAuth.isLoggedIn.mockReturnValue(false);
    TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
  });

  it('redirects to /login when token is expired', () => {
    mockAuth.isLoggedIn.mockReturnValue(false);
    TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
