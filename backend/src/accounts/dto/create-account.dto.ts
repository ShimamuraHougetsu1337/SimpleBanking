import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên tài khoản không được để trống' })
  @MaxLength(100, { message: 'Tên tài khoản không được vượt quá 100 ký tự' })
  name: string;

  @IsString()
  @IsOptional()
  theme?: string;
}
