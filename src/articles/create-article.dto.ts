import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  text?: string | null;

  @IsString()
  @IsNotEmpty()
  title: string;
}
