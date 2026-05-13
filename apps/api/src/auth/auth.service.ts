import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UsersService } from '../users/users.service';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user-role.enum';
import { SignUpDto } from './dto/sign-up.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(password, user.password))
    ) {
      throw new UnauthorizedException();
    }
    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
      }),
    };
  }

  async signUp(dto: SignUpDto) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const org = await qr.manager.save(Organization, {
        name: dto.orgName,
        parentOrgId: null,
      });
      const hashed = await bcrypt.hash(dto.password, 10);
      const user = await qr.manager.save(User, {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        password: hashed,
        role: UserRole.Owner,
        orgId: org.id,
      });
      await qr.commitTransaction();
      return {
        access_token: this.jwtService.sign({
          sub: user.id,
          email: user.email,
          role: user.role,
          orgId: user.orgId,
        }),
      };
    } catch (err: unknown) {
      await qr.rollbackTransaction();
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException('Email already registered');
      }
      throw err;
    } finally {
      await qr.release();
    }
  }
}
