import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { JwtPayload, UserRole } from '@taskMgr/auth';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

jest.mock('bcrypt');

const mockUser = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  password: 'hashed-password',
};

const mockCaller: JwtPayload = {
  id: 10,
  email: 'owner@example.com',
  role: UserRole.Owner,
  orgId: 5,
};

const mockQueryRunner = {
  connect: jest.fn().mockResolvedValue(undefined),
  startTransaction: jest.fn().mockResolvedValue(undefined),
  commitTransaction: jest.fn().mockResolvedValue(undefined),
  rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
  manager: {
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  },
};

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
};

describe('UsersService', () => {
  let service: UsersService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn().mockReturnValue(mockUser),
            save: jest.fn().mockResolvedValue(mockUser),
            find: jest.fn().mockResolvedValue([mockUser]),
            findOneBy: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
            createQueryBuilder: jest.fn().mockReturnValue({
              addSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue(mockUser),
            }),
          },
        },
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('hashes the password and sets orgId from caller', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const dto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'plaintext',
        role: UserRole.Admin,
      };

      const result = await service.create(dto, mockCaller);

      expect(bcrypt.hash).toHaveBeenCalledWith('plaintext', 10);
      expect(result).toEqual(mockUser);
    });

    it('throws ForbiddenException when role Owner is submitted', async () => {
      const dto = {
        firstName: 'J', lastName: 'D', email: 'j@d.com', password: 'pass1234',
        role: UserRole.Owner,
      };
      await expect(service.create(dto, mockCaller)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when caller has no orgId', async () => {
      const dto = { firstName: 'J', lastName: 'D', email: 'j@d.com', password: 'pass1234', role: UserRole.Admin };
      const callerNoOrg: JwtPayload = { ...mockCaller, orgId: null };
      await expect(service.create(dto, callerNoOrg)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByEmail', () => {
    it('uses query builder and selects the password column', async () => {
      const repo = module.get(getRepositoryToken(User));
      const result = await service.findByEmail('john.doe@example.com');
      expect(repo.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(repo.createQueryBuilder().addSelect).toHaveBeenCalledWith('user.password');
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('returns an array of users', async () => {
      const result = await service.findAll();
      expect(result).toEqual([mockUser]);
    });
  });

  describe('findOne', () => {
    it('returns a user by id', async () => {
      const result = await service.findOne(1);
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('updates a user', async () => {
      const result = await service.update(1, { firstName: 'Jane' });
      expect(result).toEqual({ affected: 1 });
    });
  });

  describe('remove', () => {
    it('removes a user via transaction', async () => {
      const result = await service.remove(1);
      expect(mockQueryRunner.manager.update).toHaveBeenCalled();
      expect(mockQueryRunner.manager.delete).toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });
  });
});
