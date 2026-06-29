import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';

/**
 * UsersController — intentionally minimal.
 *
 * Per API_SPEC.md, there are no direct /users endpoints for customers.
 * - User registration is handled by AuthController (POST /auth/register)
 * - User profile is read via AuthModule
 * - Admin user management routes live in AdminController
 *
 * This controller exists as the correct NestJS module entry point
 * and is ready to receive future user-facing routes (e.g., GET /users/me).
 */
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
