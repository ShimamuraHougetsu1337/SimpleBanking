import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class DepositDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @IsString()
  description?: string;
}
