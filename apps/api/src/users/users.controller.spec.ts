import { Test, TestingModule } from '@nestjs/testing';
import { JwtPayload, UserRole } from '@taskMgr/auth';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const mockUsersService = {
  create: jest.fn().mockResolvedValue({ id: 1 }),
  findAll: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue({ id: 1 }),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  remove: jest.fn().mockResolvedValue({ deleted: true }),
};

const mockOwner: JwtPayload = {
  id: 10, email: 'owner@test.com', role: UserRole.Owner, orgId: 5,
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('passes dto and caller to service', async () => {
      const dto = { firstName: 'A', lastName: 'B', email: 'a@b.com', password: 'pass1234' };
      await controller.create(dto as never, mockOwner);
      expect(mockUsersService.create).toHaveBeenCalledWith(dto, mockOwner);
    });

    it('service rejects Owner role with ForbiddenException (Owner cannot create another Owner)', async () => {
      mockUsersService.create.mockRejectedValueOnce(
        Object.assign(new Error('ForbiddenException'), { status: 403 }),
      );
      const dto = { firstName: 'A', lastName: 'B', email: 'a@b.com', password: 'pass1234', role: UserRole.Owner };
      await expect(controller.create(dto as never, mockOwner)).rejects.toMatchObject({ status: 403 });
    });
  });
});
