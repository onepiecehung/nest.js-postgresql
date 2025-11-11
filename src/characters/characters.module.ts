import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
import { Character } from './entities/character.entity';
import { SeriesCharacter } from 'src/series/entities/series-character.entity';
import { ReactionsModule } from 'src/reactions/reactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Character, SeriesCharacter]),
    ReactionsModule,
  ],
  controllers: [CharactersController],
  providers: [CharactersService],
  exports: [CharactersService],
})
export class CharactersModule {}
