import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReactionsModule } from 'src/reactions/reactions.module';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
import { Character } from './entities/character.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Character]), ReactionsModule],
  controllers: [CharactersController],
  providers: [CharactersService],
  exports: [CharactersService],
})
export class CharactersModule {}
