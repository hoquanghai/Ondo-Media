import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DatabaseModule } from '@app/database';
import { SERVICE_TOKENS } from '@app/common';
import { HealthController } from './health.controller';
import { AuthGatewayModule } from './auth/auth.module';
import { UserGatewayModule } from './users/user.module';
import { PostGatewayModule } from './posts/post.module';
import { AnnouncementGatewayModule } from './announcements/announcement.module';
import { SurveyGatewayModule } from './surveys/survey.module';
import { NotificationGatewayModule } from './notifications/notification.module';
import { FileGatewayModule } from './files/file.module';
import { JwtMiddleware } from './middleware/jwt.middleware';
import { GatewayJwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    ClientsModule.register([
      {
        name: SERVICE_TOKENS.AUTH_SERVICE,
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3001 },
      },
      {
        name: SERVICE_TOKENS.USER_SERVICE,
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3002 },
      },
      {
        name: SERVICE_TOKENS.POST_SERVICE,
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3003 },
      },
      {
        name: SERVICE_TOKENS.ANNOUNCEMENT_SERVICE,
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3004 },
      },
      {
        name: SERVICE_TOKENS.SURVEY_SERVICE,
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3005 },
      },
      {
        name: SERVICE_TOKENS.NOTIFICATION_SERVICE,
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3006 },
      },
      {
        name: SERVICE_TOKENS.FILE_SERVICE,
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3007 },
      },
    ]),
    AuthGatewayModule,
    UserGatewayModule,
    PostGatewayModule,
    AnnouncementGatewayModule,
    SurveyGatewayModule,
    NotificationGatewayModule,
    FileGatewayModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GatewayJwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes('*');
  }
}
