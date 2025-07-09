import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CanBeUndefined } from '../utilities/can-be-undefined';

export class UpdateArticleDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  content?: string | null;

  @IsString()
  @IsNotEmpty()
  @CanBeUndefined()
  title?: string;
}
