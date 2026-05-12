import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Organization } from './organizations/entities/organization.entity';
import { User } from './users/entities/user.entity';
import { UserRole } from './users/entities/user-role.enum';
import { Task } from './tasks/entities/task.entity';
import { TaskStatus } from './tasks/entities/task-status.enum';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const orgRepo = app.get<Repository<Organization>>(
    getRepositoryToken(Organization),
  );
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const taskRepo = app.get<Repository<Task>>(getRepositoryToken(Task));

  // --- Organizations (upsert by name) ---
  let root = await orgRepo.findOne({ where: { name: 'Acme Corp' } });
  if (!root) {
    root = await orgRepo.save(orgRepo.create({ name: 'Acme Corp', parentOrgId: null }));
  }

  let child = await orgRepo.findOne({ where: { name: 'Acme EMEA' } });
  if (!child) {
    child = await orgRepo.save(
      orgRepo.create({ name: 'Acme EMEA', parentOrgId: root.id }),
    );
  }

  // --- Users (upsert by email) ---
  const seedUsers = [
    { firstName: 'Alice', lastName: 'Owner', email: 'alice@acme.com', role: UserRole.Owner },
    { firstName: 'Bob', lastName: 'Admin', email: 'bob@acme.com', role: UserRole.Admin },
    { firstName: 'Carol', lastName: 'Viewer', email: 'carol@acme.com', role: UserRole.Viewer },
  ];

  const hashedPassword = await bcrypt.hash('Password123!', 10);
  const savedUsers: User[] = [];

  for (const u of seedUsers) {
    const existing = await userRepo.findOne({ where: { email: u.email } });
    if (existing) {
      savedUsers.push(existing);
    } else {
      const created = await userRepo.save(
        userRepo.create({ ...u, password: hashedPassword, orgId: root.id }),
      );
      savedUsers.push(created);
    }
  }

  const ownerUser = savedUsers[0];

  // --- Tasks (wipe and reinsert) ---
  await taskRepo.delete({ orgId: root.id });

  await taskRepo.save([
    taskRepo.create({
      title: 'Set up infrastructure',
      status: TaskStatus.Todo,
      orgId: root.id,
      createdById: ownerUser.id,
    }),
    taskRepo.create({
      title: 'Onboard first team',
      status: TaskStatus.InProgress,
      orgId: root.id,
      createdById: ownerUser.id,
    }),
    taskRepo.create({
      title: 'Launch MVP',
      status: TaskStatus.Done,
      orgId: root.id,
      createdById: ownerUser.id,
    }),
  ]);

  console.log('Seed complete.');
  await app.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
