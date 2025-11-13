import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Character } from 'src/characters/entities/character.entity';
import { ReactionsModule } from 'src/reactions/reactions.module';
import { Staff, StaffSeries } from './entities';
import { StaffsController } from './staffs.controller';
import { StaffsService } from './staffs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Staff, Character, StaffSeries]),
    ReactionsModule,
  ],
  controllers: [StaffsController],
  providers: [StaffsService],
  exports: [StaffsService],
})
export class StaffsModule {}
