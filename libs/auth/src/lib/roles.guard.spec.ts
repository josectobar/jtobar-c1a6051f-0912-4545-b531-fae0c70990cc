import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from './user-role.enum';

function makeContext(user: unknown, handler = {}, controller = {}): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function makeReflector(actions: string[] | undefined): Reflector {
  return { getAllAndOverride: () => actions } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('allows through when no @Roles metadata is set', () => {
    const guard = new RolesGuard(makeReflector(undefined));
    expect(guard.canActivate(makeContext({ role: UserRole.Viewer }))).toBe(true);
  });

  it('allows through when @Roles is empty array', () => {
    const guard = new RolesGuard(makeReflector([]));
    expect(guard.canActivate(makeContext({ role: UserRole.Viewer }))).toBe(true);
  });

  it('throws ForbiddenException when req.user is missing', () => {
    const guard = new RolesGuard(makeReflector(['createTask']));
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when req.user has no role', () => {
    const guard = new RolesGuard(makeReflector(['createTask']));
    expect(() => guard.canActivate(makeContext({}))).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException for unrecognized role', () => {
    const guard = new RolesGuard(makeReflector(['createTask']));
    expect(() => guard.canActivate(makeContext({ role: 'SuperAdmin' }))).toThrow(ForbiddenException);
  });

  it('allows Viewer on createTask (ownership enforced at service layer)', () => {
    const guard = new RolesGuard(makeReflector(['createTask']));
    expect(guard.canActivate(makeContext({ role: UserRole.Viewer }))).toBe(true);
  });

  it('allows Viewer on updateTask', () => {
    const guard = new RolesGuard(makeReflector(['updateTask']));
    expect(guard.canActivate(makeContext({ role: UserRole.Viewer }))).toBe(true);
  });

  it('allows Admin on updateTask', () => {
    const guard = new RolesGuard(makeReflector(['updateTask']));
    expect(guard.canActivate(makeContext({ role: UserRole.Admin }))).toBe(true);
  });

  it('allows Owner on all task actions', () => {
    const guard = new RolesGuard(makeReflector(['createTask', 'readTask', 'updateTask', 'deleteTask']));
    expect(guard.canActivate(makeContext({ role: UserRole.Owner }))).toBe(true);
  });

  it('allows Viewer on readTask', () => {
    const guard = new RolesGuard(makeReflector(['readTask']));
    expect(guard.canActivate(makeContext({ role: UserRole.Viewer }))).toBe(true);
  });

  it('allows Owner on manageOrg', () => {
    const guard = new RolesGuard(makeReflector(['manageOrg']));
    expect(guard.canActivate(makeContext({ role: UserRole.Owner }))).toBe(true);
  });

  it('throws ForbiddenException when Admin tries manageOrg', () => {
    const guard = new RolesGuard(makeReflector(['manageOrg']));
    expect(() => guard.canActivate(makeContext({ role: UserRole.Admin }))).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when Viewer tries manageOrg', () => {
    const guard = new RolesGuard(makeReflector(['manageOrg']));
    expect(() => guard.canActivate(makeContext({ role: UserRole.Viewer }))).toThrow(ForbiddenException);
  });

  it('allows Owner on manageUsers', () => {
    const guard = new RolesGuard(makeReflector(['manageUsers']));
    expect(guard.canActivate(makeContext({ role: UserRole.Owner }))).toBe(true);
  });

  it('throws ForbiddenException when Admin tries manageUsers', () => {
    const guard = new RolesGuard(makeReflector(['manageUsers']));
    expect(() => guard.canActivate(makeContext({ role: UserRole.Admin }))).toThrow(ForbiddenException);
  });
});
