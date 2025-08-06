import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  getAll() {
    return this.categoriesService.getAll();
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthenticationGuard)
  create(@Body() category: CreateCategoryDto) {
    return this.categoriesService.create(category);
  }

  @Patch(':id')
  @UseGuards(JwtAuthenticationGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() category: CreateCategoryDto,
  ) {
    return this.categoriesService.update(id, category);
  }

  @Delete(':id')
  @UseGuards(JwtAuthenticationGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.categoriesService.deleteCategoryWithArticles(id);
  }

  @Patch()
  @UseGuards(JwtAuthenticationGuard)
  mergeCategories() {
    return this.categoriesService.mergeCategories();
  }
}
