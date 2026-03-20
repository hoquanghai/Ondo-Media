import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DatabaseModule,
  User,
  Permission,
  UserPermission,
  Post,
  Like,
  Comment,
} from '@app/database';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([User, Permission, UserPermission, Post, Like, Comment]),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
