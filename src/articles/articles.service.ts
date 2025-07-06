import {Injectable, NotFoundException} from '@nestjs/common';
import {Article} from './article';
import {ArticleDto} from './articles.dto';
import {PrismaService} from '../database/prisma.service';

@Injectable()
export class ArticlesService {
    constructor(
        private readonly prismaService: PrismaService,
    ) {}


}
