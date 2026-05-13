import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Pick<AuthService, 'login' | 'signUp'>>;

  beforeEach(async () => {
    authService = {
      login: jest.fn().mockResolvedValue({ access_token: 'token123' }),
      signUp: jest.fn().mockResolvedValue({ access_token: 'token456' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('delegates to AuthService.login and returns access_token', async () => {
      const result = await controller.login({
        email: 'a@b.com',
        password: 'secret12',
      });
      expect(authService.login).toHaveBeenCalledWith('a@b.com', 'secret12');
      expect(result).toEqual({ access_token: 'token123' });
    });
  });

  describe('signUp', () => {
    it('delegates to AuthService.signUp and returns access_token', async () => {
      const dto = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@acme.com',
        password: 'secret12',
        orgName: 'Acme',
      };
      const result = await controller.signUp(dto);
      expect(authService.signUp).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ access_token: 'token456' });
    });
  });
});
