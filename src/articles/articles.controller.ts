import {
    Controller,
    Post,
    Body,
    Get,
    Put,
    Patch,
    Delete,
    Param,
} from '@nestjs/common';
import {ArticlesService} from './articles.service';
import {ArticleDto} from './articles.dto';
import {ParseIntPipe} from "@nestjs/common";

@Controller('articles')
export class ArticleController {
    constructor(private readonly articlesService: ArticlesService) {
    }

    @Post()
    create(@Body() article: ArticleDto) {
        return this.articlesService.create(article);
    }

    @Get()
    getAll() {
        return this.articlesService.getAll();
    }

    @Get(':id')
    getById(@Param('id', ParseIntPipe) id: number) {
        return this.articlesService.getById(id);
    }

    @Delete(':id')
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.articlesService.delete(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() article: ArticleDto) {
        return this.articlesService.update(id, article);
    }
}
