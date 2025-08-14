import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateProfileImageDto {
  @IsString()
  @IsUrl()
  @IsOptional()
  url?: string;
}
