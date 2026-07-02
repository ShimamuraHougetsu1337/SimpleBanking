import { IsObject, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @IsObject()
  updates: Record<string, any>;

  @IsOptional()
  updatedBy?: string;
}
