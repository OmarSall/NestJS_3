import { Test } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../database/prisma.service';
import { ArticlesService } from '../articles/articles.service';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaError } from '../database/prisma-error.enum';

describe('The CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    category: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    article: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  beforeEach(async () => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      article: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ArticlesService,
          useValue: {},
        },
      ],
    }).compile();
    service = module.get(CategoriesService);
  });
  describe('when getAll method is called', () => {
    it('should return all categories', async () => {
      const rows = [
        {
          id: 1,
          name: 'Tech',
        },
        {
          id: 2,
          name: 'News',
        },
      ];
      prisma.category.findMany.mockResolvedValue(rows);
      const result = await service.getAll();
      expect(prisma.category.findMany).toHaveBeenCalled();
      expect(result).toBe(rows);
    });
  });
  describe('when getById method is called', () => {
    it('should return category with articles when found', async () => {
      const category = {
        id: 10,
        name: 'Tech',
        articles: [],
      };
      prisma.category.findUnique.mockResolvedValue(category);
      const result = await service.getById(10);
      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: {
          id: 10,
        },
        include: {
          articles: true,
        },
      });
      expect(result).toBe(category);
    });
    it('should throw NotFoundException when category not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(service.getById(999)).rejects.toThrow(NotFoundException);
    });
  });
  describe('when create method is called', () => {
    it('should create category with given name', async () => {
      const dto = {
        name: 'Science',
      };
      const created = {
        id: 3,
        name: 'Science',
      };
      prisma.category.create.mockResolvedValue(created);
      const result = await service.create(dto);
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { name: dto.name },
      });
      expect(result).toBe(created);
    });
  });
  describe('when update method is called', () => {
    it('should update category name', async () => {
      const dto = {
        name: 'Tech & Science',
      };
      const updated = {
        id: 1,
        name: dto.name,
      };
      prisma.category.update.mockResolvedValue(updated);
      const result = await service.update(1, dto);
      expect(prisma.category.update).toHaveBeenCalledWith({
        data: { name: dto.name },
        where: { id: 1 },
      });
      expect(result).toBe(updated);
    });
    it('should throw NotFoundException when category does not exist (P2025)', async () => {
      const dto = { name: 'Whatever' };
      prisma.category.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record to update not found', {
          code: PrismaError.RecordDoesNotExist,
          clientVersion: Prisma.prismaVersion.client,
        }),
      );
      await expect(service.update(123, dto)).rejects.toThrow(NotFoundException);
    });
  });
  describe('when delete method is called', () => {
    it('should delete category by id', async () => {
      const deleted = { id: 4, name: 'ToDelete' };
      prisma.category.delete.mockResolvedValue(deleted);
      const result = await service.delete(4);
      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: 4 },
      });
      expect(result).toBe(deleted);
    });
    it('should throw NotFoundException when category does not exist (P2025)', async () => {
      prisma.category.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record to delete not found', {
          code: PrismaError.RecordDoesNotExist,
          clientVersion: Prisma.prismaVersion.client,
        }),
      );
      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });
  describe('when the deleteCategoryWithArticles method is called', () => {
    it('should delete all articles in category and then delete the category', async () => {
      prisma.$transaction.mockImplementation(async (callback) =>
        callback(prisma),
      );
      const category = {
        id: 7,
        name: 'Old',
        articles: [{ id: 101 }, { id: 102 }],
      };
      prisma.category.findUnique.mockResolvedValue(category);
      prisma.article.deleteMany.mockResolvedValue({ count: 2 });
      prisma.category.delete.mockResolvedValue({ id: 7, name: 'Old' });
      await expect(
        service.deleteCategoryWithArticles(7),
      ).resolves.toBeUndefined();
      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 7 },
        include: { articles: true },
      });
      expect(prisma.article.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [101, 102] } },
      });
      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: 7 },
      });
    });
    it('should throw NotFoundException if category does not exist', async () => {
      prisma.$transaction.mockImplementation(async (callback) =>
        callback(prisma),
      );
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(service.deleteCategoryWithArticles(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
  describe('when the mergeCategories method is called', () => {
    it('should merge duplicate categories (move articles and delete newer ones)', async () => {
      prisma.$transaction.mockImplementation(async (callback) =>
        callback(prisma),
      );
      prisma.category.findMany.mockResolvedValue([
        { id: 1, name: 'Tech' },
        { id: 2, name: 'Tech' },
        { id: 3, name: 'News' },
      ]);
      prisma.article.findMany.mockResolvedValue([
        { id: 201, title: 'Title A' },
        { id: 202, title: 'Title B' },
      ]);
      prisma.article.update.mockResolvedValue({});
      prisma.category.delete.mockResolvedValue({});
      await service.mergeCategories();
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        orderBy: { id: 'asc' },
      });
      expect(prisma.article.findMany).toHaveBeenCalledWith({
        where: {
          categories: {
            some: {
              id: 2,
            },
          },
        },
      });
      expect(prisma.article.update).toHaveBeenCalledWith({
        where: {
          id: 201,
        },
        data: {
          categories: {
            disconnect: { id: 2 },
            connect: { id: 1 },
          },
        },
      });
      expect(prisma.article.update).toHaveBeenCalledWith({
        where: {
          id: 202,
        },
        data: {
          categories: {
            disconnect: { id: 2 },
            connect: { id: 1 },
          },
        },
      });
      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: {
          id: 2,
        },
      });
    });
    it('should do nothing when there are no duplicates', async () => {
      prisma.$transaction.mockImplementation(async (callback) =>
        callback(prisma),
      );
      prisma.category.findMany.mockResolvedValue([
        { id: 1, name: 'Tech' },
        { id: 2, name: 'News' },
      ]);
      await service.mergeCategories();
      expect(prisma.article.findMany).not.toHaveBeenCalled();
      expect(prisma.article.update).not.toHaveBeenCalled();
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });
  });
});
