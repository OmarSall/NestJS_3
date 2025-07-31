import { IsString, IsNotEmpty } from 'class-validator';
import { CanBeUndefined } from '../../utilities/can-be-undefined';

export class UpdateCommentDto {
  @IsString()
  @IsNotEmpty()
  @CanBeUndefined()
  content?: string;
}
