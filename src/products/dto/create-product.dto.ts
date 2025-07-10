import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  IsBoolean,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  price: number;

  @IsBoolean()
  @IsNotEmpty()
  isInStock: boolean;
}
