import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateAccountDto {
  @ApiPropertyOptional({ example: 'My Savings Account' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  theme?: string;
}
