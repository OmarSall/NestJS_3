import { Test, TestingModule } from '@nestjs/testing';
import { ArticlesService } from './articles.service';
import { PrismaService } from '../database/prisma.service';
import { ArticleNotFoundException } from './article-not-found.exception';
import { SlugNotUniqueException } from './slug-not-unique';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaError } from '../database/prisma-error.enum';
import { Prisma } from '@prisma/client';

describe('The ArticlesService', () => {
  let articlesService: ArticlesService;
  let prismaService: {
    $transaction: jest.Mock;
    article: {
      deleteMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      $transaction: jest.fn(),
      article: {
        deleteMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();
    articlesService = module.get<ArticlesService>(ArticlesService);
  });
  describe('when the create method is called', () => {
    it('should create an article and connect categories and author', async () => {
      const dto = {
        title: 'Title',
        text: 'Content',
        urlSlug: 'test-title',
        categoryIds: [1, 2],
      };

      const expectedArticle = {
        ...dto,
        id: 1,
        categories: [],
        author: {
          id: 123,
        },
      };

      prismaService.article.create.mockResolvedValue(expectedArticle);

      const result = await articlesService.create(dto as any, 123);

      expect(prismaService.article.create).toHaveBeenCalledWith({
        data: {
          title: dto.title,
          text: dto.text,
          urlSlug: dto.urlSlug,
          author: { connect: { id: 123 } },
          categories: { connect: [{ id: 1 }, { id: 2 }] },
        },
        include: { categories: true },
      });

      expect(result).toBe(expectedArticle);
    });

    it('should throw SlugNotUniqueException if urlSlug is not unique', async () => {
      const dto = {
        title: 'Title',
        text: 'Content',
        urlSlug: 'duplicate-slug',
      };

      const fakeError = {
        code: 'P2002',
        message: 'some message',
      };

      Object.setPrototypeOf(
        fakeError,
        Prisma.PrismaClientKnownRequestError.prototype,
      );
      prismaService.article.create.mockRejectedValue(fakeError);
      await expect(articlesService.create(dto as any, 123)).rejects.toThrow(
        SlugNotUniqueException,
      );
    });

    it('should throw BadRequestException if category does not exist', async () => {
      const dto = {
        title: 'Title',
        text: 'Content',
        urlSlug: 'valid-slug',
        categoryIds: [999],
      };

      const fakeError = {
        code: 'P2025',
        message: 'some message',
      };

      Object.setPrototypeOf(
        fakeError,
        Prisma.PrismaClientKnownRequestError.prototype,
      );
      prismaService.article.create.mockRejectedValue(fakeError);
      await expect(articlesService.create(dto as any, 123)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
  describe('when the getAll method is called', () => {
    it('should return all articles', async () => {
      const articles = [{ id: 1 }, { id: 2 }];

      prismaService.article.findMany.mockResolvedValue(articles);

      const result = await articlesService.getAll();

      expect(prismaService.article.findMany).toHaveBeenCalledWith();
      expect(result).toBe(articles);
    });
  });
  describe('when the getById method is called', () => {
    it('should return the article when found', async () => {
      const article = {
        id: 1,
        title: 'Test',
        author: {},
        categories: [],
      };

      prismaService.article.findUnique.mockResolvedValue(article);

      const result = await articlesService.getById(1);

      expect(prismaService.article.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { author: true, categories: true },
      });

      expect(result).toBe(article);
    });
    it('should throw ArticleNotFoundException if not found', async () => {
      prismaService.article.findUnique.mockResolvedValue(null);

      await expect(articlesService.getById(999)).rejects.toThrow(
        ArticleNotFoundException,
      );
    });
  });
  describe('when the delete method is called', () => {
    it('should delete the article by id', async () => {
      const articleId = 1;
      const deletedArticle = {
        id: articleId,
      };
      prismaService.article.delete.mockResolvedValue(deletedArticle);

      const result = await articlesService.delete(articleId);

      expect(prismaService.article.delete).toHaveBeenCalledWith({
        where: {
          id: articleId,
        },
      });
      expect(result).toBe(deletedArticle);
    });
    it('should throw NotFoundException if article does not exist', async () => {
      const articleId = 1;
      const fakeError = {
        code: PrismaError.RecordDoesNotExist,
        message: 'Record does not exist',
      };
      Object.setPrototypeOf(
        fakeError,
        Prisma.PrismaClientKnownRequestError.prototype,
      );
      prismaService.article.delete.mockRejectedValue(fakeError);

      await expect(articlesService.delete(articleId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
  describe('when the update method is called', () => {
    it('should update the article by id', async () => {
      const dto = {
        title: 'Updated title',
        urlSlug: 'updated-title',
      };
      const updated = { id: 1, ...dto };
      prismaService.article.update.mockResolvedValue(updated);

      const result = await articlesService.update(1, dto as any);

      expect(prismaService.article.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ...dto, id: undefined },
      });

      expect(result).toBe(updated);
    });
    it('should throw ArticleNotFoundException if article not found', async () => {
      const fakeError = {
        code: PrismaError.RecordDoesNotExist,
        message: 'Record does not exist',
      };

      Object.setPrototypeOf(
        fakeError,
        Prisma.PrismaClientKnownRequestError.prototype,
      );

      prismaService.article.update.mockRejectedValue(fakeError);

      await expect(articlesService.update(1, {} as any)).rejects.toThrow(
        ArticleNotFoundException,
      );
    });
    it('should throw SlugNotUniqueException if urlSlug is not unique', async () => {
      const dto = { urlSlug: 'duplicate-slug' };

      const fakeError = {
        code: PrismaError.UniqueConstraintViolated,
        message: 'Unique constraint',
      };

      Object.setPrototypeOf(
        fakeError,
        Prisma.PrismaClientKnownRequestError.prototype,
      );

      prismaService.article.update.mockRejectedValue(fakeError);

      await expect(articlesService.update(1, dto as any)).rejects.toThrow(
        SlugNotUniqueException,
      );
    });
  });
  describe('deleteMultipleArticles', () => {
    it('should delete multiple articles in a transaction', async () => {
      prismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(prismaService);
      });

      prismaService.article.deleteMany.mockResolvedValue({ count: 3 });

      await expect(
        articlesService.deleteMultipleArticles([1, 2, 3]),
      ).resolves.toBeUndefined();

      expect(prismaService.article.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2, 3] } },
      });
    });
    it('should throw NotFoundException if not all articles were deleted', async () => {
      prismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(prismaService);
      });

      prismaService.article.deleteMany.mockResolvedValue({ count: 2 });

      await expect(
        articlesService.deleteMultipleArticles([1, 2, 3]),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
