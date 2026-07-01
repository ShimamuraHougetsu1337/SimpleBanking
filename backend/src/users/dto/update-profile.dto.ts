import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'Nguyen Van A',
    description: 'Full name (2–100 characters)',
  })
  @IsString()
  @Length(2, 100)
  fullName: string;
}
