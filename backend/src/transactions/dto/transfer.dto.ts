import { IsString, IsNotEmpty, IsUUID, Matches, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4')
  @IsNotEmpty()
  from_accountId: string;

  @ApiProperty({ example: 'VN17198234569999' })
  @IsString()
  @IsNotEmpty()
  to_accountNumber: string;

  @ApiProperty({ example: '500000.00', description: 'Decimal string, max 2 decimal places' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'Invalid transfer amount (maximum 2 decimal places)' })
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ required: false, example: 'Dinner share' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4')
  @IsNotEmpty()
  idempotencyKey: string;
}
