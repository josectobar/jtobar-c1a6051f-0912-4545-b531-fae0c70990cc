import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtPayload, UserRole } from '@taskMgr/auth';
import { Repository } from 'typeorm';
import { Organization } from '../organizations/entities/organization.entity';
import { Task } from './entities/task.entity';
import { TasksService } from './tasks.service';

const mockTask = (overrides: Partial<Task> = {}): Task =>
  ({ id: 1, title: 'T', orgId: 10, createdById: 42, ...overrides } as Task);

const mockUser = (overrides: Partial<JwtPayload> = {}): JwtPayload => ({
  id: 42,
  email: 'u@test.com',
  role: UserRole.Viewer,
  orgId: 10,
  ...overrides,
});

describe('TasksService', () => {
  let service: TasksService;
  let tasksRepo: jest.Mocked<Partial<Repository<Task>>>;
  let orgsRepo: jest.Mocked<Partial<Repository<Organization>>>;

  beforeEach(async () => {
    const qbMock = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
    };

    tasksRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qbMock),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    orgsRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: tasksRepo },
        { provide: getRepositoryToken(Organization), useValue: orgsRepo },
      ],
    }).compile();

    service = module.get(TasksService);
  });

  describe('getVisibleOrgIds (via findAll)', () => {
    it('Viewer gets only their own orgId', async () => {
      const user = mockUser({ role: UserRole.Viewer, orgId: 10 });
      await service.findAll(user);
      expect(orgsRepo.find).not.toHaveBeenCalled();
      const qb = (tasksRepo.createQueryBuilder as jest.Mock).mock.results[0].value;
      expect(qb.where).toHaveBeenCalledWith('task.orgId IN (:...orgIds)', { orgIds: [10] });
    });

    it('Admin gets their org plus direct children', async () => {
      (orgsRepo.find as jest.Mock).mockResolvedValue([{ id: 11 }, { id: 12 }]);
      const user = mockUser({ role: UserRole.Admin, orgId: 10 });
      await service.findAll(user);
      const qb = (tasksRepo.createQueryBuilder as jest.Mock).mock.results[0].value;
      expect(qb.where).toHaveBeenCalledWith('task.orgId IN (:...orgIds)', { orgIds: [10, 11, 12] });
    });

    it('Owner gets their org plus direct children', async () => {
      (orgsRepo.find as jest.Mock).mockResolvedValue([{ id: 20 }]);
      const user = mockUser({ role: UserRole.Owner, orgId: 10 });
      await service.findAll(user);
      const qb = (tasksRepo.createQueryBuilder as jest.Mock).mock.results[0].value;
      expect(qb.where).toHaveBeenCalledWith('task.orgId IN (:...orgIds)', { orgIds: [10, 20] });
    });

    it('throws ForbiddenException when user.orgId is null', async () => {
      const user = mockUser({ orgId: null });
      await expect(service.findAll(user)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when task not in visible scope', async () => {
      const user = mockUser({ orgId: 10 });
      const qb = (tasksRepo.createQueryBuilder as jest.Mock).mock.results[0]?.value ?? {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      (tasksRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      await expect(service.findOne(99, user)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user.orgId is null', async () => {
      const user = mockUser({ orgId: null });
      await expect(service.findOne(1, user)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('sets orgId and createdById from user, ignoring DTO values', async () => {
      const user = mockUser({ id: 5, orgId: 10 });
      const saved = mockTask({ orgId: 10, createdById: 5 });
      (tasksRepo.create as jest.Mock).mockReturnValue(saved);
      (tasksRepo.save as jest.Mock).mockResolvedValue(saved);
      await service.create({ title: 'T', orgId: 99 } as never, user);
      expect(tasksRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: 10, createdById: 5 }),
      );
    });

    it('throws ForbiddenException when user.orgId is null', async () => {
      const user = mockUser({ orgId: null });
      await expect(service.create({ title: 'T' } as never, user)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update — ownership checks', () => {
    beforeEach(() => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockTask({ createdById: 42, orgId: 10 })),
      };
      (tasksRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      (tasksRepo.save as jest.Mock).mockResolvedValue(mockTask());
    });

    it('allows task creator to update their own task', async () => {
      const user = mockUser({ id: 42, role: UserRole.Viewer });
      await expect(service.update(1, {}, user)).resolves.toBeDefined();
    });

    it('allows Admin to update any task', async () => {
      const user = mockUser({ id: 99, role: UserRole.Admin });
      await expect(service.update(1, {}, user)).resolves.toBeDefined();
    });

    it('allows Owner to update any task', async () => {
      const user = mockUser({ id: 99, role: UserRole.Owner });
      await expect(service.update(1, {}, user)).resolves.toBeDefined();
    });

    it('throws ForbiddenException when Viewer tries to update another user task', async () => {
      const user = mockUser({ id: 99, role: UserRole.Viewer });
      await expect(service.update(1, {}, user)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when Viewer tries to update unclaimed task', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockTask({ createdById: null })),
      };
      (tasksRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      const user = mockUser({ id: 42, role: UserRole.Viewer });
      await expect(service.update(1, {}, user)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove — ownership checks', () => {
    beforeEach(() => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockTask({ createdById: 42, orgId: 10 })),
      };
      (tasksRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      (tasksRepo.remove as jest.Mock).mockResolvedValue(undefined);
    });

    it('allows Owner to delete any task', async () => {
      const user = mockUser({ id: 99, role: UserRole.Owner });
      await expect(service.remove(1, user)).resolves.toBeUndefined();
    });

    it('throws ForbiddenException when Viewer tries to delete another user task', async () => {
      const user = mockUser({ id: 99, role: UserRole.Viewer });
      await expect(service.remove(1, user)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when Viewer tries to delete unclaimed task', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockTask({ createdById: null })),
      };
      (tasksRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
      const user = mockUser({ id: 42, role: UserRole.Viewer });
      await expect(service.remove(1, user)).rejects.toThrow(ForbiddenException);
    });
  });
});
