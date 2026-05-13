import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload, UserRole } from '@taskMgr/auth';
import { Task } from './entities/task.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(Organization)
    private readonly orgsRepository: Repository<Organization>,
  ) {}

  private async getVisibleOrgIds(user: JwtPayload): Promise<number[]> {
    if (user.orgId == null) throw new ForbiddenException();

    if (user.role === UserRole.Viewer) {
      return [user.orgId];
    }

    const children = await this.orgsRepository.find({
      select: ['id'],
      where: { parentOrgId: user.orgId },
    });

    return [user.orgId, ...children.map((o) => o.id)];
  }

  async create(dto: CreateTaskDto, user: JwtPayload): Promise<Task> {
    if (user.orgId == null) throw new ForbiddenException();
    const task = this.tasksRepository.create({
      description: dto.description,
      title: dto.title,
      orgId: user.orgId,
      createdById: user.id,
    });
    return this.tasksRepository.save(task);
  }

  async findAll(user: JwtPayload): Promise<Task[]> {
    const orgIds = await this.getVisibleOrgIds(user);
    return this.tasksRepository
      .createQueryBuilder('task')
      .where('task.orgId IN (:...orgIds)', { orgIds })
      .getMany();
  }

  async findOne(id: number, user: JwtPayload): Promise<Task> {
    const orgIds = await this.getVisibleOrgIds(user);
    const task = await this.tasksRepository
      .createQueryBuilder('task')
      .where('task.id = :id', { id })
      .andWhere('task.orgId IN (:...orgIds)', { orgIds })
      .getOne();
    if (!task) throw new NotFoundException(`Task #${id} not found`);
    return task;
  }

  async update(
    id: number,
    dto: UpdateTaskDto,
    user: JwtPayload,
  ): Promise<Task> {
    const task = await this.findOne(id, user);
    this.assertCanModify(task, user);
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.category !== undefined) task.category = dto.category;
    return this.tasksRepository.save(task);
  }

  async remove(id: number, user: JwtPayload): Promise<void> {
    const task = await this.findOne(id, user);
    this.assertCanModify(task, user);
    await this.tasksRepository.remove(task);
  }

  private assertCanModify(task: Task, user: JwtPayload): void {
    if (
      task.createdById !== user.id &&
      user.role !== UserRole.Admin &&
      user.role !== UserRole.Owner
    ) {
      throw new ForbiddenException();
    }
  }
}
