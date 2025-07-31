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
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  getAll() {
    return this.booksService.getAll();
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthenticationGuard)
  create(@Body() book: CreateBookDto) {
    return this.booksService.create(book);
  }

  @Patch(':id')
  @UseGuards(JwtAuthenticationGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() book: UpdateBookDto) {
    return this.booksService.update(id, book);
  }

  @Delete(':id')
  @UseGuards(JwtAuthenticationGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.booksService.delete(id);
  }
}
