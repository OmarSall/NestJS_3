import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TasksDto } from './dto/tasks.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './update-task.dto';
import { Prisma } from '@prisma/client';
import { PrismaError } from '../database/prisma-error.enum';

@Injectable()
export class TasksService {
  constructor(private readonly prismaService: PrismaService) {}

  create(task: CreateTaskDto) {
    return this.prismaService.task.create({
      data: task,
    });
  }

  getAll() {
    return this.prismaService.task.findMany();
  }

  async getById(id: number) {
    const task = await this.prismaService.task.findUnique({
      where: {
        id,
      },
    });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  async delete(id: number) {
    try {
      return await this.prismaService.task.delete({
        where: {
          id,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code == PrismaError.RecordDoesNotExist
      ) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }
      throw error;
    }
  }

  async update(id: number, task: UpdateTaskDto) {
    try {
      return await this.prismaService.task.update({
        data: {
          ...task,
          id: undefined,
        },
        where: {
          id,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code == PrismaError.RecordDoesNotExist
      ) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }
      throw error;
    }
  }
}
