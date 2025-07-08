import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TasksDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsNotEmpty()
    description!: string;

    @IsOptional()
    @IsBoolean()
    isCompleted?: boolean;
}