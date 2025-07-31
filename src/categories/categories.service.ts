import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaError } from '../database/prisma-error.enum';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prismaService: PrismaService) {}

  getAll() {
    return this.prismaService.category.findMany();
  }

  async getById(id: number) {
    const category = await this.prismaService.category.findUnique({
      where: {
        id,
      },
      include: {
        articles: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return category;
  }

  create(category: CreateCategoryDto) {
    return this.prismaService.category.create({
      data: {
        name: category.name,
      },
    });
  }

  async update(id: number, category: UpdateCategoryDto) {
    try {
      return await this.prismaService.category.update({
        data: {
          name: category.name,
        },
        where: {
          id,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PrismaError.RecordDoesNotExist
      ) {
        throw new NotFoundException(`Category with id ${id} not found`);
      }
      throw error;
    }
  }

  async delete(id: number) {
    try {
      return await this.prismaService.category.delete({
        where: {
          id,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PrismaError.RecordDoesNotExist
      ) {
        throw new NotFoundException(`Category with id ${id} not found`);
      }
      throw error;
    }
  }
}
