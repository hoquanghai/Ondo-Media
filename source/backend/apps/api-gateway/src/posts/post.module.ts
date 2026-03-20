import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SERVICE_TOKENS } from '@app/common';
import { PostController } from './post.controller';
import { CommentController } from './comment.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SERVICE_TOKENS.POST_SERVICE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get<string>('POST_SERVICE_HOST', 'localhost'),
            port: parseInt(config.get<string>('POST_SERVICE_PORT', '3003'), 10),
          },
        }),
      },
    ]),
  ],
  controllers: [PostController, CommentController],
  exports: [ClientsModule],
})
export class PostGatewayModule {}
