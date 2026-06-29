import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for registering a new user.
 * Used by AuthService.register() — not exposed as a direct user endpoint.
 */
export class CreateUserDto {
  @ApiProperty({
    example: 'Nguyen Van A',
    description: 'Full name (2–100 characters)',
  })
  @IsString()
  @Length(2, 100)
  fullName: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Unique email address used for login',
  })
  @IsEmail()
  email: string;

  /**
   * Password must be at least 6 characters and contain:
   * uppercase, lowercase, digit, and a special character.
   */
  @ApiProperty({
    example: 'Password@123',
    description: 'Min 6 chars: uppercase, lowercase, digit, special character',
  })
  @IsString()
  @Length(6, 128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
  })
  password: string;
}
