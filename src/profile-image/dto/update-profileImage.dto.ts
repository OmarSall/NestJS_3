import { IsString, IsUrl } from 'class-validator';

export class UpdateProfileImageDto {
  @IsString()
  @IsUrl()
  url?: string;
}
