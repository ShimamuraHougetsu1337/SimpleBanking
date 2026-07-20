import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FraudFlagStatus } from '../entities/fraud-flag.entity';

export class GetFraudFlagsQueryDto {
  @IsOptional()
  @IsEnum(FraudFlagStatus)
  status?: FraudFlagStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
