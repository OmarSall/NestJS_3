import {
    Body,
    Controller,
    Get,
    Post,
    Param,
    Delete,
    Patch,
    ParseIntPipe,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskDto } from './task.dto';

@Controller('tasks')
export class TaskController {
    constructor(private readonly taskService: TaskService) {}

    @Post()
    create(@Body() task: TaskDto) {
        return this.taskService.create(task);
    }
}