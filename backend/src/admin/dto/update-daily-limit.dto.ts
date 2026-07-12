import { IsOptional, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDailyLimitDto {
  @ApiPropertyOptional({ example: '10000000.00', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'Hạn mức giao dịch phải là số hợp lệ với tối đa 2 chữ số thập phân' })
  dailyLimit: string | null;
}
