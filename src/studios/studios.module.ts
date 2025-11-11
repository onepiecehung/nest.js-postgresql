import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudiosController } from './studios.controller';
import { StudiosService } from './studios.service';
import { Studio } from './entities/studio.entity';
import { SeriesStudio } from 'src/series/entities/series-studio.entity';
import { ReactionsModule } from 'src/reactions/reactions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Studio, SeriesStudio]), ReactionsModule],
  controllers: [StudiosController],
  providers: [StudiosService],
  exports: [StudiosService],
})
export class StudiosModule {}
