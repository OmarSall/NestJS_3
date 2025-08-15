import {
  Controller,
  Patch,
  Body,
  UseGuards,
  Req,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import { RequestWithUser } from '../authentication/request-with-user';
import { TransformPlainToInstance } from 'class-transformer';
import { AuthenticationResponseDto } from '../authentication/dto/authentication-response.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('update-phone')
  @UseGuards(JwtAuthenticationGuard)
  @TransformPlainToInstance(AuthenticationResponseDto)
  async updatePhone(
    @Req() req: RequestWithUser,
    @Body('phoneNumber') phoneNumber: string,
  ) {
    return this.usersService.updatePhoneNumber(req.user.id, phoneNumber);
  }

  @Delete()
  @UseGuards(JwtAuthenticationGuard)
  deleteSelf(
    @Req() request: RequestWithUser,
    @Query('newAuthorId', new ParseIntPipe({ optional: true }))
    newAuthorId?: number,
  ) {
    return this.usersService.deleteUserAndHandleArticles(
      request.user.id,
      newAuthorId,
    );
  }
}
