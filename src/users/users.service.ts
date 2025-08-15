import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { UserDto } from './user.dto';
import { Prisma } from '@prisma/client';
import { PrismaError } from '../database/prisma-error.enum';

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
      throw new NotFoundException(`User with email ${email} not found`);
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PrismaError.UniqueConstraintViolated
      ) {
        throw new ConflictException('User with that email already exists');
      }
      throw error;
    }
  }

  async updatePhoneNumber(userId: number, phoneNumber: string) {
    try {
      return await this.prismaService.user.update({
        where: { id: userId },
        data: { phoneNumber },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code == PrismaError.RecordDoesNotExist
      ) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      throw error;
    }
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

  async deleteUserAndHandleArticles(userId: number, newAuthorId?: number) {
    try {
      return await this.prismaService.$transaction(async (prisma) => {
        if (newAuthorId) {
          await prisma.article.updateMany({
            where: { authorId: userId },
            data: { authorId: newAuthorId },
          });
        } else {
          await prisma.article.deleteMany({
            where: { authorId: userId },
          });
        }
        return prisma.user.delete({ where: { id: userId } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code == PrismaError.RecordDoesNotExist) {
          throw new NotFoundException(`User with ID ${userId} not found`);
        }
      }
      throw error;
    }
  }
}
