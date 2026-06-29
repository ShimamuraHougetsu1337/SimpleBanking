import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  // Register the User entity with TypeORM for this module's scope
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  // Export UsersService so AuthModule and AdminModule can inject it
  exports: [UsersService],
})
export class UsersModule {}
