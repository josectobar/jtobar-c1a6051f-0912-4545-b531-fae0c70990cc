import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Pick<AuthService, 'login'>>;

  beforeEach(async () => {
    authService = { login: jest.fn().mockResolvedValue({ access_token: 'token123' }) };

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
      const result = await controller.login({ email: 'a@b.com', password: 'secret12' });
      expect(authService.login).toHaveBeenCalledWith('a@b.com', 'secret12');
      expect(result).toEqual({ access_token: 'token123' });
    });
  });
});
