import {Injectable, NotFoundException} from '@nestjs/common';
import {PrismaService} from '../database/prisma.service';
import {TaskDto} from './task.dto';
import {Prisma} from '@prisma/client';

@Injectable()
export class TaskService {
    constructor(
        private readonly prismaService: PrismaService,
    )

    create(task: TaskDto) {
        return this.prismaService.task.create({
            data: task,
        });
    }
}