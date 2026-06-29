import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../entities/user.entity';

/**
 * DTO for admin update-status operations (lock / unlock a user).
 * Maps to PATCH /admin/users/:id/status in API_SPEC.md.
 */
export class UpdateUserStatusDto {
  @ApiPropertyOptional({ enum: UserStatus, example: UserStatus.LOCKED })
  @IsEnum(UserStatus)
  status: UserStatus;

  @ApiPropertyOptional({ example: 'Violation of terms of service' })
  @IsString()
  @IsOptional()
  reason?: string;
}
