import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Character, CharacterStaff } from 'src/characters/entities';
import { ReactionsModule } from 'src/reactions/reactions.module';
import { Staff, StaffSeries } from './entities';
import { StaffsController } from './staffs.controller';
import { StaffsService } from './staffs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Staff, Character, CharacterStaff, StaffSeries]),
    ReactionsModule,
  ],
  controllers: [StaffsController],
  providers: [StaffsService],
  exports: [StaffsService],
})
export class StaffsModule {}
