import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@/users/entities/user.entity';

export class UpdateUserStatusDto {
  @ApiPropertyOptional({ enum: UserStatus, example: UserStatus.LOCKED })
  @IsEnum(UserStatus)
  status: UserStatus;

  @ApiPropertyOptional({ example: 'Violation of terms of service' })
  @IsString()
  @IsOptional()
  reason?: string;
}
