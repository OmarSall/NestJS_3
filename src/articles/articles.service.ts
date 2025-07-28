import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import { ArticleNotFoundException } from './article-not-found.exception';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaError } from '../database/prisma-error.enum';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { SlugNotUniqueException } from './slug-not-unique';

@Injectable()
export class ArticlesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(article: CreateArticleDto, authorId: number) {
    const categories = article.categoryIds?.map((id) => {
      return {
        id,
      };
    });

    try {
      return await this.prismaService.article.create({
        data: {
          title: article.title,
          text: article.text,
          urlSlug: article.urlSlug,
          author: {
            connect: {
              id: authorId,
            },
          },
          categories: {
            connect: categories,
          },
        },
        include: {
          categories: true,
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
        throw error;
      }
      if (
          error.code === PrismaError.RecordDoesNotExist
      ) {
        throw new BadRequestException('Wrong category id provided');
      }
      if (
          error.code === PrismaError.UniqueConstraintViolated
      ) {
        throw new SlugNotUniqueException(article.urlSlug);
      }
      throw error;
    }
  }

  getAll() {
    return this.prismaService.article.findMany();
  }

  async getById(id: number) {
    const article = await this.prismaService.article.findUnique({
      where: {
        id,
      },
    });
    if (!article) {
      throw new ArticleNotFoundException(id);
    }
    return article;
  }

  async delete(id: number) {
    try {
      return await this.prismaService.article.delete({
        where: {
          id,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code == PrismaError.RecordDoesNotExist
      ) {
        throw new NotFoundException();
      }
      throw error;
    }
  }

  async update(id: number, article: UpdateArticleDto) {
    try {
      return await this.prismaService.article.update({
        data: {
          ...article,
          id: undefined,
        },
        where: {
          id,
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
        throw error;
      }
      if (error.code === PrismaError.RecordDoesNotExist) {
        throw new ArticleNotFoundException(id);
      }
      if (error.code === PrismaError.UniqueConstraintViolated) {
        throw new SlugNotUniqueException(article.urlSlug);
      }
      throw error;
    }
  }
}
