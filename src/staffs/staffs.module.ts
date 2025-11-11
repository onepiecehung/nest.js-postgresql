import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffsController } from './staffs.controller';
import { StaffsService } from './staffs.service';
import { Staff, StaffCharacter } from './entities';
import { Character } from 'src/characters/entities/character.entity';
import { SeriesStaff } from 'src/series/entities/series-staff.entity';
import { ReactionsModule } from 'src/reactions/reactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Staff, Character, StaffCharacter, SeriesStaff]),
    ReactionsModule,
  ],
  controllers: [StaffsController],
  providers: [StaffsService],
  exports: [StaffsService],
})
export class StaffsModule {}
