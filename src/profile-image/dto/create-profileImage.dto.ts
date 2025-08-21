import { IsInt, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateProfileImageDto {
  @IsString()
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsInt()
  @IsNotEmpty()
  userId: number;
}
