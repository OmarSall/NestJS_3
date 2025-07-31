import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateProfileImageDto {
  @IsString()
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsNotEmpty()
  userId: number;
}
