import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ParseIntPipe } from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import { ArticleResponseDto } from './dto/article-response.dto';
import { TransformPlainToInstance } from 'class-transformer';
import { RequestWithUser } from '../authentication/request-with-user';

@Controller('articles')
export class ArticleController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @UseGuards(JwtAuthenticationGuard)
  create(@Body() article: CreateArticleDto, @Req() request: RequestWithUser) {
    return this.articlesService.create(article, request.user.id);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get()
  @TransformPlainToInstance(ArticleResponseDto)
  getAll() {
    return this.articlesService.getAll();
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get(':id')
  @TransformPlainToInstance(ArticleResponseDto)
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

  @Patch(':id/upvote')
  upvote(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.upvote(id);
  }

  @Patch(':id/downvote')
  downvote(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.downvote(id);
  }

  @Delete()
  deleteLowUpvoteArticles(
    @Query('upvotesFewerThan', ParseIntPipe) threshold: number,
  ) {
    return this.articlesService.deleteArticlesWithLowUpVotes(threshold);
  }

  @Patch()
  reassignArticles(
    @Query('previousAuthor', ParseIntPipe) previousAuthor: number,
    @Query('newAuthor', ParseIntPipe) newAuthor: number,
  ) {
    return this.articlesService.reassignArticles(previousAuthor, newAuthor);
  }
}
