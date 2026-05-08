import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

const mockUser = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
    it('should create a user', async () => {
      const createUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      };
      const result = await service.create(createUserDto);
      expect(result).toEqual(mockUser);
    });
  });
  describe('findAll', () => {
    it('should return an array of users', async () => {
      const result = await service.findAll();
      expect(result).toEqual([mockUser]);
    });
  });
  describe('findOne', () => {
    it('should return a user by id', async () => {
      const result = await service.findOne(1);
      expect(result).toEqual(mockUser);
    });
  });
  describe('update', () => {
    it('should update a user', async () => {
      const updateUserDto = { firstName: 'Jane' };
      const result = await service.update(1, updateUserDto);
      expect(result).toEqual({ affected: 1 });
    });
  });
  describe('remove', () => {
    it('should remove a user', async () => {
      const result = await service.remove(1);
      expect(result).toEqual({ affected: 1 });
    });
  });
});
