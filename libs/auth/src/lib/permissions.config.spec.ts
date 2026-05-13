import { ROLE_PERMISSIONS } from './permissions.config';
import { UserRole } from './user-role.enum';

describe('ROLE_PERMISSIONS', () => {
  it('Owner has all permissions', () => {
    const p = ROLE_PERMISSIONS[UserRole.Owner];
    expect(p.createTask).toBe(true);
    expect(p.readTask).toBe(true);
    expect(p.updateTask).toBe(true);
    expect(p.deleteTask).toBe(true);
    expect(p.manageOrg).toBe(true);
    expect(p.manageUsers).toBe(true);
  });

  it('Admin has all task permissions but cannot manage org or users', () => {
    const p = ROLE_PERMISSIONS[UserRole.Admin];
    expect(p.createTask).toBe(true);
    expect(p.readTask).toBe(true);
    expect(p.updateTask).toBe(true);
    expect(p.deleteTask).toBe(true);
    expect(p.manageOrg).toBe(false);
    expect(p.manageUsers).toBe(false);
  });

  it('Viewer has all task permissions (ownership enforced at service layer)', () => {
    const p = ROLE_PERMISSIONS[UserRole.Viewer];
    expect(p.createTask).toBe(true);
    expect(p.readTask).toBe(true);
    expect(p.updateTask).toBe(true);
    expect(p.deleteTask).toBe(true);
    expect(p.manageOrg).toBe(false);
    expect(p.manageUsers).toBe(false);
  });

  it('only Owner has manageOrg', () => {
    expect(ROLE_PERMISSIONS[UserRole.Owner].manageOrg).toBe(true);
    expect(ROLE_PERMISSIONS[UserRole.Admin].manageOrg).toBe(false);
    expect(ROLE_PERMISSIONS[UserRole.Viewer].manageOrg).toBe(false);
  });

  it('only Owner has manageUsers', () => {
    expect(ROLE_PERMISSIONS[UserRole.Owner].manageUsers).toBe(true);
    expect(ROLE_PERMISSIONS[UserRole.Admin].manageUsers).toBe(false);
    expect(ROLE_PERMISSIONS[UserRole.Viewer].manageUsers).toBe(false);
  });
});
