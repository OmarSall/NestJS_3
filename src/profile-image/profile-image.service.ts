import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProfileImageDto } from './dto/create-profileImage.dto';
import { UpdateProfileImageDto } from './dto/update-profileImage.dto';
import { Prisma } from '@prisma/client';
import { PrismaError } from '../database/prisma-error.enum';

@Injectable()
export class ProfileImageService {
  constructor(private readonly prismaService: PrismaService) {}

  create(data: CreateProfileImageDto) {
    return this.prismaService.profileImage.create({
      data,
    });
  }

  findAll() {
    return this.prismaService.profileImage.findMany({
      include: { user: true },
    });
  }

  async findOne(id: number) {
    const image = await this.prismaService.profileImage.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!image) {
      throw new NotFoundException();
    }
    return image;
  }

  async update(id: number, data: UpdateProfileImageDto) {
    try {
      return await this.prismaService.profileImage.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PrismaError.RecordDoesNotExist
      ) {
        throw new NotFoundException();
      }
      throw error;
    }
  }

  async delete(id: number) {
    try {
      return await this.prismaService.profileImage.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PrismaError.RecordDoesNotExist
      ) {
        throw new NotFoundException();
      }
      throw error;
    }
  }
}
