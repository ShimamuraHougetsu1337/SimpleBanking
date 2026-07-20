import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { FraudFlagStatus } from '../entities/fraud-flag.entity';

export class ReviewFraudFlagDto {
  @IsEnum(FraudFlagStatus)
  status: FraudFlagStatus;

  @IsOptional()
  @IsString()
  reviewNote?: string;

  @IsOptional()
  @IsBoolean()
  lockAccount?: boolean;
}
