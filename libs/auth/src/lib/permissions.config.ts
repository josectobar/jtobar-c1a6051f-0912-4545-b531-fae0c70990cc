import { UserRole } from './user-role.enum';

export type PermissionAction =
  | 'createTask'
  | 'readTask'
  | 'updateTask'
  | 'deleteTask'
  | 'manageOrg'
  | 'manageUsers';

export interface PermissionSet {
  createTask: boolean;
  readTask: boolean;
  updateTask: boolean;
  deleteTask: boolean;
  manageOrg: boolean;
  manageUsers: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, PermissionSet> = {
  [UserRole.Owner]:  { createTask: true,  readTask: true,  updateTask: true,  deleteTask: true,  manageOrg: true,  manageUsers: true  },
  [UserRole.Admin]:  { createTask: true,  readTask: true,  updateTask: true,  deleteTask: true,  manageOrg: false, manageUsers: false },
  [UserRole.Viewer]: { createTask: true,  readTask: true,  updateTask: true,  deleteTask: true,  manageOrg: false, manageUsers: false },
};
