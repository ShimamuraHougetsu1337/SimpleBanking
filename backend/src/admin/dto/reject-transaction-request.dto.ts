import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectTransactionRequestDto {
  @ApiProperty({ example: 'Sai số tài khoản nhận tiền', description: 'Rejection reason (1-1000 characters)' })
  @IsString()
  @Length(1, 1000)
  rejectionReason: string;
}
