import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPassword@123',
    description: 'Current password',
  })
  @IsString()
  oldPassword: string;

  @ApiProperty({
    example: 'NewPassword@123',
    description: 'Min 6 chars: uppercase, lowercase, digit, special character',
  })
  @IsString()
  @Length(6, 128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
  })
  newPassword: string;
}
