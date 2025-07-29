import { IsString } from 'class-validator';
import { CanBeUndefined } from '../../utilities/can-be-undefined';

export class UpdateBookDto {
  @CanBeUndefined()
  @IsString()
  title?: string;
}
