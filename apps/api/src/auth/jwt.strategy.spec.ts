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
      });
      expect(result).toEqual({ id: 42, email: 'u@test.com', role: UserRole.Admin, orgId: 10 });
    });

    it('handles null role and orgId', () => {
      const result = strategy.validate({ sub: 1, email: 'x@x.com', role: null, orgId: null });
      expect(result).toEqual({ id: 1, email: 'x@x.com', role: null, orgId: null });
    });
  });
});
