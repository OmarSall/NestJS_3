import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { PrismaError } from '../database/prisma-error.enum';

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  getAll() {
    return this.prisma.book.findMany({
      include: { authors: true },
    });
  }

  async getById(id: number) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: { authors: true },
    });
    if (!book) {
      throw new NotFoundException();
    }
    return book;
  }

  async create(book: CreateBookDto) {
    const authors = book.authorIds?.map((id) => ({ id }));
    try {
      return await this.prisma.book.create({
        data: {
          title: book.title,
          authors: {
            connect: authors,
          },
        },
        include: { authors: true },
      });
    } catch (error) {
      if (error.code === PrismaError.RecordDoesNotExist)
        throw new BadRequestException('Invalid author ID');
      throw error;
    }
  }

  async update(id: number, book: UpdateBookDto) {
    try {
      return await this.prisma.book.update({
        where: { id },
        data: {
          title: book.title,
        },
        include: { authors: true },
      });
    } catch (error) {
      if (error.code === PrismaError.RecordDoesNotExist)
        throw new NotFoundException();
      throw error;
    }
  }

  async delete(id: number) {
    try {
      return await this.prisma.book.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === PrismaError.RecordDoesNotExist)
        throw new NotFoundException();
      throw error;
    }
  }
}
