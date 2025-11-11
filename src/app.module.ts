import {
  AcceptLanguageResolver,
  CookieResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { join } from 'path';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AnalyticsModule } from './analytics/analytics.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArticlesModule } from './articles/articles.module';
import { AuthorsModule } from './authors/authors.module';
import { AuthModule } from './auth/auth.module';
import { BadgesModule } from './badges/badges.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { CharactersModule } from './characters/characters.module';
import { CommentsModule } from './comments/comments.module';
import { FollowModule } from './follow/follow.module';
import { MediaModule } from './media/media.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PermissionsModule } from './permissions/permissions.module';
import { QrModule } from './qr/qr.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { ReactionsModule } from './reactions/reactions.module';
import { ReportsModule } from './reports/reports.module';
import { SeriesModule } from './series/series.module';
import { ShareModule } from './share/share.module';
import { StaffsModule } from './staffs/staffs.module';
import { StudiosModule } from './studios/studios.module';
import {
  appConfig,
  awsConfig,
  databaseConfig,
  DatabaseConfigFactory,
  firebaseConfig,
  mailConfig,
  oauthConfig,
  r2Config,
  redisConfig,
  stickerConfig,
} from './shared/config';
import { configValidationSchema } from './shared/config/schema';
import { CacheModule, MailModule, RabbitmqModule } from './shared/services';
import { StickersModule } from './stickers/stickers.module';
import { TagsModule } from './tags/tags.module';
import { UsersModule } from './users/users.module';
import { WorkerModule } from './workers/worker.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      validationSchema: configValidationSchema,
      isGlobal: true,
      envFilePath: '.env',
      expandVariables: true,
      cache: true,
      load: [
        () => ({ app: appConfig() }),
        () => ({ database: databaseConfig() }),
        () => ({ redis: redisConfig() }),
        () => ({ mail: mailConfig() }),
        () => ({ aws: awsConfig() }),
        () => ({ oauth: oauthConfig() }),
        () => ({
          r2: r2Config(),
        }),
        () => ({
          sticker: stickerConfig(),
        }),
        () => ({ firebase: firebaseConfig() }),
      ],
    }),
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfigFactory,
    }),
    I18nModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        fallbackLanguage: configService.getOrThrow<string>(
          'app.i18n.fallbackLanguage',
        ),
        loaderOptions: {
          path: join(__dirname, '../i18n/'),
          watch: true,
        },
      }),
      resolvers: [
        new QueryResolver(['lang', 'language']),
        new HeaderResolver(['x-api-language', 'x-custom-lang', 'x-lang']),
        new CookieResolver(),
        AcceptLanguageResolver,
      ],
      inject: [ConfigService],
    }),
    UsersModule,
    CacheModule,
    WorkerModule,
    RabbitmqModule,
    MailModule,
    MediaModule,
    AuthModule,
    AuthorsModule,
    BadgesModule,
    CharactersModule,
    QrModule,
    RateLimitModule,
    ArticlesModule,
    ReactionsModule,
    CommentsModule,
    StickersModule,
    ReportsModule,
    BookmarksModule,
    TagsModule,
    NotificationsModule,
    FollowModule,
    AnalyticsModule,
    ShareModule,
    StaffsModule,
    StudiosModule,
    SeriesModule,
    OrganizationsModule,
    PermissionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
