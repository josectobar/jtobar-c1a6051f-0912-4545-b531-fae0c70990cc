import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@taskMgr/auth';
import { JwtStrategy } from './jwt.strategy';

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('test-secret'),
} as unknown as ConfigService;

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy(mockConfigService);
  });

  describe('validate', () => {
    it('returns full JwtPayload from token claims', () => {
      const result = strategy.validate({
        sub: 42,
        email: 'u@test.com',
        role: UserRole.Admin,
        orgId: 10,
        orgName: 'Acme',
      });
      expect(result).toEqual({ id: 42, email: 'u@test.com', role: UserRole.Admin, orgId: 10, orgName: 'Acme' });
    });

    it('sets orgName to null when absent from payload', () => {
      const result = strategy.validate({
        sub: 42,
        email: 'u@test.com',
        role: UserRole.Admin,
        orgId: 10,
        orgName: null,
      });
      expect(result.orgName).toBeNull();
    });

    it('throws UnauthorizedException when role is missing', () => {
      expect(() =>
        strategy.validate({ sub: 1, email: 'x@x.com', role: null, orgId: 10, orgName: null }),
      ).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when orgId is missing', () => {
      expect(() =>
        strategy.validate({ sub: 1, email: 'x@x.com', role: UserRole.Owner, orgId: null, orgName: null }),
      ).toThrow(UnauthorizedException);
    });
  });
});
