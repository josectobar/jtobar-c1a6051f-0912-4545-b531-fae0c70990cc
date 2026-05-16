import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandlerFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

const mockRouter = { navigate: vi.fn() };
const mockAuth = { getToken: vi.fn(), logout: vi.fn() };

function runInterceptor(req: HttpRequest<unknown>, handlerFn: HttpHandlerFn) {
  return TestBed.runInInjectionContext(() => authInterceptor(req, handlerFn));
}

describe('authInterceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('attaches Authorization header on protected requests', () => {
    mockAuth.getToken.mockReturnValue('my-token');
    const req = new HttpRequest('GET', '/api/tasks');
    let captured: HttpRequest<unknown> | undefined;
    const handler: HttpHandlerFn = (r) => { captured = r as HttpRequest<unknown>; return of(new HttpResponse()); };

    runInterceptor(req, handler).subscribe();
    expect(captured?.headers.get('Authorization')).toBe('Bearer my-token');
  });

  it('does NOT attach Authorization header on login request', () => {
    mockAuth.getToken.mockReturnValue('my-token');
    const req = new HttpRequest('POST', '/api/auth/login', {});
    let captured: HttpRequest<unknown> | undefined;
    const handler: HttpHandlerFn = (r) => { captured = r as HttpRequest<unknown>; return of(new HttpResponse()); };

    runInterceptor(req, handler).subscribe();
    expect(captured?.headers.get('Authorization')).toBeNull();
  });

  it('redirects to /login on 401 response', () => {
    mockAuth.getToken.mockReturnValue(null);
    const req = new HttpRequest('GET', '/api/tasks');
    const handler: HttpHandlerFn = () => throwError(() => new HttpErrorResponse({ status: 401 }));

    runInterceptor(req, handler).subscribe({ error: () => {} });
    expect(mockAuth.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});
