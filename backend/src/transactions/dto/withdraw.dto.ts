import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class WithdrawDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount: number;

  @IsString()
  description?: string;
}
