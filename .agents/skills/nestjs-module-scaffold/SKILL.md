---
name: nestjs-module-scaffold
description: >
  Scaffold a NestJS module according to Simple Banking App standards.
  Trigger when: creating features, modules, entities, controllers, services, DTOs,
  or mapping repositories.
triggers:
  - "create NestJS module"
  - "scaffold module"
  - "create backend feature"
  - "create controller"
  - "create service"
  - "create entity"
  - "create DTO"
  - "new NestJS module"
---

# Skill: NestJS Module Scaffold — Banking App Pattern

## When to Use This Skill

Use this skill when initializing or expanding domain scopes in the NestJS application:
`AuthModule`, `UserModule`, `AccountModule`, `TransactionModule`, `AdminModule`.

## Standard Module Folder Layout

```
src/<feature>/
├── dto/
│   ├── create-<feature>.dto.ts
│   └── update-<feature>.dto.ts
├── entities/
│   └── <feature>.entity.ts
├── <feature>.controller.ts
├── <feature>.service.ts
└── <feature>.module.ts
```

## Entity Template

```typescript
// entities/account.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from '@/users/entities/user.entity';

export enum AccountStatus {
  ACTIVE = 'active',
  LOCKED = 'locked',
}

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @ManyToOne(() => User, user => user.accounts)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'account_number', unique: true, length: 20 })
  account_number: string;

  // IMPORTANT: Use numeric column types for currency, NEVER floats
  @Column({ type: 'numeric', precision: 18, scale: 2, default: '0.00' })
  balance: string; // string type prevents floating point calculation errors in JS context

  @Column({ length: 3, default: 'VND' })
  currency: string;

  @Column({ type: 'enum', enum: AccountStatus, default: AccountStatus.ACTIVE })
  status: AccountStatus;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}
```

## Input DTO Template with Validation

```typescript
// dto/create-account.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiPropertyOptional({ default: 'VND' })
  @IsString()
  @IsOptional()
  currency?: string = 'VND';
}
```

## Service Layer Template

```typescript
// accounts.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {}

  async findByUserId(userId: string): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });
    if (!account) throw new NotFoundException('Account does not exist');
    return account;
  }

  async findByAccountNumber(accountNumber: string): Promise<Account | null> {
    return this.accountRepository.findOne({
      where: { account_number: accountNumber },
    });
  }

  // Account number generator pattern: VN + timestamp(10) + random(4)
  private generateAccountNumber(): string {
    const ts = Date.now().toString().slice(-10);
    const rand = Math.floor(Math.random() * 9000 + 1000).toString();
    return `VN${ts}${rand}`;
  }

  async create(userId: string): Promise<Account> {
    let accountNumber: string;
    let exists = true;
    
    // Retries in case of an extremely rare collision
    while (exists) {
      accountNumber = this.generateAccountNumber();
      exists = !!(await this.accountRepository.findOne({
        where: { account_number: accountNumber },
      }));
    }
    
    const account = this.accountRepository.create({
      user_id: userId,
      account_number: accountNumber,
    });
    return this.accountRepository.save(account);
  }
}
```

## Controller Layer Template

```typescript
// accounts.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AccountsService } from './accounts.service';
import { User } from '@/users/entities/user.entity';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)  // Guard applied to all routes in this controller
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user account info' })
  async getMyAccount(@CurrentUser() user: User) {
    // Controller layer delegates logic directly to service, keeping it thin
    return this.accountsService.findByUserId(user.id);
  }
}
```

## Module Template

```typescript
// accounts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Account])],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService], // Exported for use in other modules
})
export class AccountsModule {}
```

## Custom Parameter Decorators

```typescript
// common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@/users/entities/user.entity';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

## Global Exception Filter

```typescript
// common/filters/http-exception.filter.ts
import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus,
} from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception instanceof HttpException
      ? exception.getResponse()
      : null;

    response.status(status).json({
      statusCode: status,
      error: typeof exceptionResponse === 'object'
        ? (exceptionResponse as any).error
        : 'INTERNAL_SERVER_ERROR',
      message: typeof exceptionResponse === 'object'
        ? (exceptionResponse as any).message
        : 'Internal server error',
      timestamp: new Date().toISOString(),
    });
  }
}
```

## Scaffolding Checklist

- [ ] Create layout structure: `dto/`, `entities/`, module/controller/service files.
- [ ] Map entity structures: `numeric(18,2)` column types for balances, `uuid` primary keys, `timestamptz` date fields.
- [ ] Add properties, validations (`class-validator`), and swagger decorators (`@ApiProperty`) to DTOs.
- [ ] Inject repository classes via `@InjectRepository` in services.
- [ ] Delegate logic in controllers, leaving them thin.
- [ ] Register repositories inside the imports section in modules.
- [ ] Register new modules inside the main app configuration imports block.
