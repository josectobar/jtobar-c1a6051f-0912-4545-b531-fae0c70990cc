import { UserRole } from './user-role.enum';

export interface JwtPayload {
  id: number;
  email: string;
  role: UserRole | null;
  orgId: number | null;
  orgName: string | null;
}
