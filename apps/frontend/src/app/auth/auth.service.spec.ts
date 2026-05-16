import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from './auth.service';
import { Task } from '../tasks/task.model';

function makeToken(payload: object, expOffsetSeconds = 3600): string {
  const claims = { ...payload, exp: Math.floor(Date.now() / 1000) + expOffsetSeconds };
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(claims));
  return `${header}.${body}.signature`;
}

const mockHttpClient = { post: vi.fn() };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService, { provide: HttpClient, useValue: mockHttpClient }],
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => localStorage.clear());

  describe('JWT decode', () => {
    it('reads sub as userId (not id)', () => {
      const token = makeToken({ sub: 42, email: 'a@b.com', role: 'Owner', orgId: 1, orgName: 'Acme' });
      localStorage.setItem('auth_token', token);
      expect(service.getCurrentUserId()).toBe(42);
    });

    it('reads role from payload.role', () => {
      localStorage.setItem('auth_token', makeToken({ sub: 1, role: 'Admin', orgId: 1, orgName: 'Acme' }));
      expect(service.getRole()).toBe('Admin');
    });

    it('reads orgName from payload.orgName', () => {
      localStorage.setItem('auth_token', makeToken({ sub: 1, role: 'Owner', orgId: 1, orgName: 'Contoso' }));
      expect(service.getOrgName()).toBe('Contoso');
    });

    it('returns null for all fields when no token', () => {
      expect(service.getCurrentUserId()).toBeNull();
      expect(service.getRole()).toBeNull();
      expect(service.getOrgName()).toBeNull();
    });
  });

  describe('isLoggedIn', () => {
    it('returns false when no token in localStorage', () => {
      expect(service.isLoggedIn()).toBe(false);
    });

    it('returns false when token exp is in the past', () => {
      localStorage.setItem('auth_token', makeToken({ sub: 1, role: 'Owner', orgId: 1, orgName: 'Acme' }, -60));
      expect(service.isLoggedIn()).toBe(false);
    });

    it('returns true when token is present and non-expired', () => {
      localStorage.setItem('auth_token', makeToken({ sub: 1, role: 'Owner', orgId: 1, orgName: 'Acme' }));
      expect(service.isLoggedIn()).toBe(true);
    });
  });

  describe('canModify', () => {
    const otherTask: Task = { id: 1, title: 'T', description: null, status: 'Todo', category: null, createdById: 99, createdAt: '' };
    const ownTask: Task = { id: 2, title: 'T', description: null, status: 'Todo', category: null, createdById: 42, createdAt: '' };

    beforeEach(() => {
      localStorage.setItem('auth_token', makeToken({ sub: 42, role: 'Viewer', orgId: 1, orgName: 'Acme' }));
    });

    it('returns true for Owner on any task', () => {
      localStorage.setItem('auth_token', makeToken({ sub: 42, role: 'Owner', orgId: 1, orgName: 'Acme' }));
      expect(service.canModify(otherTask)).toBe(true);
    });

    it('returns true for Admin on any task', () => {
      localStorage.setItem('auth_token', makeToken({ sub: 42, role: 'Admin', orgId: 1, orgName: 'Acme' }));
      expect(service.canModify(otherTask)).toBe(true);
    });

    it('returns true for Viewer on their own task', () => {
      expect(service.canModify(ownTask)).toBe(true);
    });

    it('returns false for Viewer on another user\'s task', () => {
      expect(service.canModify(otherTask)).toBe(false);
    });
  });

  describe('logout', () => {
    it('removes token from localStorage', () => {
      localStorage.setItem('auth_token', makeToken({ sub: 1, role: 'Owner', orgId: 1, orgName: 'Acme' }));
      service.logout();
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });
});
