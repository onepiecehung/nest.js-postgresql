import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReactionsModule } from 'src/reactions/reactions.module';
import { Genre, Segments, Series, SeriesGenre } from './entities';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Series, Genre, Segments, SeriesGenre]),
    ReactionsModule,
  ],
  controllers: [SeriesController],
  providers: [SeriesService],
  exports: [SeriesService],
})
export class SeriesModule {}
