import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorsController } from './authors.controller';
import { AuthorsService } from './authors.service';
import { Author, AuthorSeries } from './entities';
import { Series } from 'src/series/entities/series.entity';
import { ReactionsModule } from 'src/reactions/reactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Author, Series, AuthorSeries]),
    ReactionsModule,
  ],
  controllers: [AuthorsController],
  providers: [AuthorsService],
  exports: [AuthorsService],
})
export class AuthorsModule {}
