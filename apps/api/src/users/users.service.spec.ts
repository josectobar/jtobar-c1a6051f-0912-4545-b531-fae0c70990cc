import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
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
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('hashes the password before saving', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const dto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'plaintext',
      };

      const result = await service.create(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('plaintext', 10);
      expect(result).toEqual(mockUser);
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
    it('removes a user', async () => {
      const result = await service.remove(1);
      expect(result).toEqual({ affected: 1 });
    });
  });
});
