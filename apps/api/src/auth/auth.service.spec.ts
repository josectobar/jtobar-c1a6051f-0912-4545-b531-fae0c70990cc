import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getDataSourceToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user-role.enum';

jest.mock('bcrypt');

const mockUser = { id: 1, email: 'test@example.com', password: 'hashed', role: UserRole.Owner, orgId: 1 };

const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: { save: jest.fn() },
};

const mockDataSource = {
  createQueryRunner: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmail'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
    mockQueryRunner.connect.mockResolvedValue(undefined);
    mockQueryRunner.startTransaction.mockResolvedValue(undefined);
    mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
    mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined);
    mockQueryRunner.release.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: { findByEmail: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('signed-token') } },
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('login', () => {
    it('returns access_token on valid credentials', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('test@example.com', 'password');

      expect(result).toEqual({ access_token: 'signed-token' });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        orgId: mockUser.orgId,
        orgName: null,
      });
    });

    it('throws UnauthorizedException when user is not found', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(service.login('unknown@example.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('test@example.com', 'wrongpass')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('register', () => {
    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    });

    it('creates org and user in a transaction and returns access_token', async () => {
      const mockOrg = { id: 1, name: 'TestOrg' };
      const mockNewUser = { id: 2, email: 'new@example.com', role: UserRole.Owner, orgId: 1 };
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(mockOrg)
        .mockResolvedValueOnce(mockNewUser);

      const result = await service.signUp({
        firstName: 'New', lastName: 'User',
        email: 'new@example.com', password: 'password123', orgName: 'TestOrg',
      });

      expect(result).toEqual({ access_token: 'signed-token' });
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('rolls back and throws ConflictException on duplicate email (code 23505)', async () => {
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ id: 1 })
        .mockRejectedValueOnce({ code: '23505' });

      await expect(service.signUp({
        firstName: 'N', lastName: 'U',
        email: 'dup@example.com', password: 'password123', orgName: 'TestOrg',
      })).rejects.toThrow(ConflictException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('rolls back and rethrows on unexpected errors', async () => {
      const error = new Error('DB connection lost');
      mockQueryRunner.manager.save.mockRejectedValueOnce(error);

      await expect(service.signUp({
        firstName: 'N', lastName: 'U',
        email: 'err@example.com', password: 'password123', orgName: 'TestOrg',
      })).rejects.toThrow(error);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});
