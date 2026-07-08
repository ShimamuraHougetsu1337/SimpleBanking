import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserHistory } from './entities/user-history.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserHistoryService } from './services/user-history.service';

@Module({
  // Register the User entity with TypeORM for this module's scope
  imports: [TypeOrmModule.forFeature([User, UserHistory])],
  controllers: [UsersController],
  providers: [UsersService, UserHistoryService],
  // Export UsersService so AuthModule and AdminModule can inject it
  exports: [UsersService, UserHistoryService],
})
export class UsersModule { }
