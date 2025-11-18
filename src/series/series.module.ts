import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ReactionsModule } from 'src/reactions/reactions.module';
import { CacheModule, RabbitmqModule } from 'src/shared/services';
import { Genre, Segments, Series, SeriesGenre } from './entities';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';
import { AniListCrawlService } from './services/anilist-crawl.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Series, Genre, Segments, SeriesGenre]),
    ReactionsModule,
    HttpModule,
    CacheModule,
    RabbitmqModule,
  ],
  controllers: [SeriesController],
  providers: [SeriesService, AniListCrawlService],
  exports: [SeriesService, AniListCrawlService],
})
export class SeriesModule {}
