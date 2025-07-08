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
import {TasksService} from './tasks.service';
import {TasksDto} from './tasks.dto';
import {UpdateTaskDto} from './update-task.dto';

@Controller('tasks')
export class TasksController {
    constructor(private readonly taskService: TasksService) {
    }

    @Post()
    create(@Body() task: TasksDto) {
        return this.taskService.create(task);
    }

    @Get()
    getAll() {
        return this.taskService.getAll();
    }

    @Get(':id')
    getById(@Param('id', ParseIntPipe) id: number) {
        return this.taskService.getById(id);
    }

    @Delete(':id')
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.taskService.delete(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() task: UpdateTaskDto) {
        return this.taskService.update(id, task);
    }
}