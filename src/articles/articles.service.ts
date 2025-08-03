import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
      if (error.code === PrismaError.RecordDoesNotExist) {
        throw new BadRequestException('Wrong category id provided');
      }
      if (error.code === PrismaError.UniqueConstraintViolated) {
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
      include: {
        author: true,
        categories: true,
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

  deleteMultipleArticles(ids: number[]) {
    return this.prismaService.$transaction(async (transactionClient) => {
      const deleteResponse = await this.prismaService.article.deleteMany({
        where: {
          id: {
            in: ids,
          },
        },
      });
      if (deleteResponse.count !== ids.length) {
        throw new NotFoundException('One of the articles count not be deleted');
      }
    });
  }

  async upvote(id: number) {
    return this.prismaService.article.update({
      where: {
        id,
      },
      data: {
        upvotes: {
          increment: 1,
        },
      },
    });
  }

  async downvote(id: number) {
    const article = await this.prismaService.article.findUnique({
      where: { id },
    });
    if (!article) {
      throw new NotFoundException(`Article with id ${id} not found`);
    }
    if (article.upvotes <= 0) {
      throw new BadRequestException('Upvotes cannot go below 0');
    }
    return this.prismaService.article.update({
      where: {
        id,
      },
      data: {
        upvotes: {
          decrement: 1,
        },
      },
    });
  }

  async deleteArticlesWithLowUpVotes(threshold: number) {
    return this.prismaService.$transaction(async (transactionClient) => {
      const articlesToDelete = await transactionClient.article.findMany({
        where: {
          upvotes: {
            lt: threshold,
          },
        },
      });
      if (articlesToDelete.length === 0) {
        throw new BadRequestException(
          'No articles found with upvotes < ' + threshold,
        );
      }

      await transactionClient.article.deleteMany({
        where: {
          id: {
            in: articlesToDelete.map((article) => article.id),
          },
        },
      });
      return {
        deletedCount: articlesToDelete.length,
      };
    });
  }

  async reassignArticles(previousAuthor: number, newAuthor: number) {
    return this.prismaService.article.updateMany({
      where: {
        authorId: previousAuthor,
      },
      data: {
        authorId: newAuthor,
      },
    });
  }
}
