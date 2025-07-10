import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  Param,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ParseIntPipe } from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Controller('articles')
export class ArticleController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  create(@Body() article: CreateArticleDto) {
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
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() article: UpdateArticleDto,
  ) {
    return this.articlesService.update(id, article);
  }
}
