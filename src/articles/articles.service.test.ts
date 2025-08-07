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
    article: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaService = {
      article: {
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
});
