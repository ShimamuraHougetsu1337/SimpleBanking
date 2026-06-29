import { CreateUserDto } from '@/users/dto/create-user.dto';

/**
 * DTO for registering a new user.
 * Inherits the validation rules from CreateUserDto.
 */
export class RegisterDto extends CreateUserDto {}
