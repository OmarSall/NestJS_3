import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProfileImageDto } from './dto/create-profileImage.dto';
import { UpdateProfileImageDto } from './dto/update-profileImage.dto';

@Injectable()
export class ProfileImageService {
  constructor(private readonly prismaService: PrismaService) {}

  create(data: CreateProfileImageDto) {
    return this.prismaService.profileImage.create({
      data,
    });
  }

  findAll() {
    return this.prismaService.profileImage.findMany({
      include: { user: true },
    });
  }

  async findOne(id: number) {
    const image = await this.prismaService.profileImage.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!image) {
      throw new NotFoundException();
    }
    return image;
  }

  async update(id: number, data: UpdateProfileImageDto) {
    return this.prismaService.profileImage.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    return this.prismaService.profileImage.delete({
      where: { id },
    });
  }
}
