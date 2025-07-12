import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { UserDto } from './user.dto';
import { PrismaError } from '../database/prisma-error.enum';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async getByEmail(email: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        email,
      },
    });
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }

  async getById(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }

  async create(user: UserDto) {
    try {
      return await this.prismaService.user.create({
        data: user,
      });
    } catch (error: unknown) {
      const prismaError = error as Prisma.PrismaClientKnownRequestError;
      if (prismaError.code === 'P2002') {
        throw new ConflictException('User with this email already exists');
      }
      throw error;
    }
  }
}
