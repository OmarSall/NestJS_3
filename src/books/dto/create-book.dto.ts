import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { CanBeUndefined } from '../../utilities/can-be-undefined';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @CanBeUndefined()
  @IsNumber({}, { each: true })
  authorIds?: number[];
}
