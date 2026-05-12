import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateOrganizationDto): Promise<Organization> {
    if (dto.parentOrgId != null) {
      const parent = await this.orgRepository.findOneBy({ id: dto.parentOrgId });
      if (!parent) {
        throw new NotFoundException(`Parent org #${dto.parentOrgId} not found`);
      }
      if (parent.parentOrgId !== null) {
        throw new UnprocessableEntityException(
          'Cannot create a grandchild org: the parent is already a child organization',
        );
      }
    }
    const org = this.orgRepository.create(dto);
    return this.orgRepository.save(org);
  }

  findAll(): Promise<Organization[]> {
    return this.orgRepository.find();
  }

  async findOne(id: number): Promise<Organization> {
    const org = await this.orgRepository.findOne({
      where: { id },
      relations: ['children'],
    });
    if (!org) throw new NotFoundException(`Organization #${id} not found`);
    return org;
  }

  async update(id: number, dto: UpdateOrganizationDto): Promise<Organization> {
    const org = await this.findOne(id);

    if (dto.parentOrgId != null) {
      if (dto.parentOrgId === id) {
        throw new UnprocessableEntityException('An organization cannot be its own parent');
      }
      const parent = await this.orgRepository.findOneBy({ id: dto.parentOrgId });
      if (!parent) {
        throw new NotFoundException(`Parent org #${dto.parentOrgId} not found`);
      }
      if (parent.parentOrgId !== null) {
        throw new UnprocessableEntityException(
          'Cannot move org under a child organization: maximum hierarchy depth is 2',
        );
      }
    }

    Object.assign(org, dto);
    return this.orgRepository.save(org);
  }

  async remove(id: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const org = await queryRunner.manager.findOne(Organization, {
        where: { id },
        relations: ['children'],
      });
      if (!org) throw new NotFoundException(`Organization #${id} not found`);

      await this._cascadeDelete(queryRunner, org);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async _cascadeDelete(queryRunner: QueryRunner, org: Organization): Promise<void> {
    // Step 1: delete all tasks belonging to this org
    await queryRunner.manager.delete(Task, { orgId: org.id });

    // Step 2: unassign users from this org
    await queryRunner.manager.update(User, { orgId: org.id }, { orgId: null });

    // Step 3: recursively handle children
    for (const child of org.children ?? []) {
      const childWithChildren = await queryRunner.manager.findOne(Organization, {
        where: { id: child.id },
        relations: ['children'],
      });
      if (childWithChildren) {
        await this._cascadeDelete(queryRunner, childWithChildren);
      }
    }

    // Step 4: delete the org itself
    await queryRunner.manager.delete(Organization, { id: org.id });
  }
}
