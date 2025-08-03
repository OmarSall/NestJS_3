import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { UserDto } from './user.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async getByEmail(email: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        email,
      },
      include: {
        address: true,
        articles: true,
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
      include: {
        address: true,
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
        data: {
          name: user.name,
          email: user.email,
          password: user.password,
          phoneNumber: user.phoneNumber,
          address: {
            create: user.address,
          },
        },
        include: {
          address: true,
          articles: true,
        },
      });
    } catch (error: unknown) {
      const prismaError = error as Prisma.PrismaClientKnownRequestError;
      if (prismaError.code === 'P2002') {
        throw new ConflictException('User with this email already exists');
      }
      throw error;
    }
  }

  async updatePhoneNumber(userId: number, phoneNumber: string) {
    return this.prismaService.user.update({
      where: { id: userId },
      data: { phoneNumber },
    });
  }

  deleteMultipleArticles(ids: number[]) {
    return this.prismaService.user.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }
}
