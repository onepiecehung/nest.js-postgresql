import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';
import { Series, SeriesCharacter, SeriesStaff, SeriesStudio } from './entities';
import { Character } from 'src/characters/entities/character.entity';
import { Staff } from 'src/staffs/entities/staff.entity';
import { Studio } from 'src/studios/entities/studio.entity';
import { ReactionsModule } from 'src/reactions/reactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Series,
      Character,
      Staff,
      Studio,
      SeriesCharacter,
      SeriesStaff,
      SeriesStudio,
    ]),
    ReactionsModule,
  ],
  controllers: [SeriesController],
  providers: [SeriesService],
  exports: [SeriesService],
})
export class SeriesModule {}
