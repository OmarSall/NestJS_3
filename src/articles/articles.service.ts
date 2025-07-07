import {Injectable, NotFoundException} from '@nestjs/common';
import {ArticleDto} from './articles.dto';
import {PrismaService} from '../database/prisma.service';
import {Prisma} from '@prisma/client'
import {PrismaError} from "../database/prisma-error.enum";

@Injectable()
export class ArticlesService {
    constructor(
        private readonly prismaService: PrismaService,
    ) {
    }

    create(article: ArticleDto) {
        return this.prismaService.article.create({
            data: article,
        });
    }

    getAll() {
        return this.prismaService.article.findMany();
    }

    async getById(id: number) {
        const article = await this.prismaService.article.findUnique({
            where: {
                id,
            }
        });
        if (!article) {
            throw new NotFoundException();
        }
        return article;
    }

    async delete(id: number) {
        try {
            return await this.prismaService.article.delete({
                where: {
                    id,
                }
            })
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

    async update(id: number, article: ArticleDto) {
        try {
            return await this.prismaService.article.update({
                data: {
                    ...article,
                    id: undefined
                }, where: {
                    id
                }
            })
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
}
