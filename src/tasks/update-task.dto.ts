import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CanBeUndefined } from '../utilities/can-be-undefined';

export class UpdateTaskDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  description?: string;

  @CanBeUndefined()
  isCompleted?: boolean;
}
