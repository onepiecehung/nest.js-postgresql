import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
  Body,
  HttpException,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import { MediaService } from './media.service';
import {
  UpdateMediaDto,
  MediaQueryDto,
  PresignedUploadDto,
  PresignedDownloadQueryDto,
} from './dto';
import { Auth } from 'src/common/decorators';
import { AuthPayload } from 'src/common/interface';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  @Auth()
  async uploadMedia(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Request() req: Request & { user: AuthPayload },
  ) {
    if (!files || files.length === 0) {
      throw new HttpException(
        {
          messageKey: 'media.MEDIA_IS_REQUIRED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.mediaService.uploadMedia(files, req.user.uid);
  }

  @Get()
  @Auth()
  async getMedia(@Query() query: MediaQueryDto) {
    return this.mediaService.getMedia(query);
  }

  @Get(':id')
  @Auth()
  async getMediaById(@Param('id') id: string) {
    return this.mediaService.getMediaById(id);
  }

  @Put(':id')
  async updateMedia(
    @Param('id') id: string,
    @Body() updateMediaDto: UpdateMediaDto,
  ) {
    return this.mediaService.updateMedia(id, updateMediaDto);
  }

  @Delete(':id')
  async deleteMedia(@Param('id') id: string) {
    return this.mediaService.deleteMedia(id);
  }

  @Post(':id/activate')
  async activateMedia(@Param('id') id: string) {
    return this.mediaService.activateMedia(id);
  }

  @Post(':id/deactivate')
  async deactivateMedia(@Param('id') id: string) {
    return this.mediaService.deactivateMedia(id);
  }

  @Post('presigned-upload')
  async generatePresignedUploadUrl(
    @Body() presignedUploadDto: PresignedUploadDto,
  ) {
    return this.mediaService.generatePresignedUploadUrl(
      presignedUploadDto.filename,

      presignedUploadDto.contentType,

      presignedUploadDto.contentLength,
    );
  }

  @Get(':id/presigned-download')
  async generatePresignedDownloadUrl(
    @Param('id') id: string,
    @Query() query: PresignedDownloadQueryDto,
  ) {
    const presignedUrl = await this.mediaService.generatePresignedDownloadUrl(
      id,

      query.expiresIn,
    );
    return {
      success: true,

      data: { presignedUrl, expiresIn: query.expiresIn },
      messageKey: 'media.PRESIGNED_URL_SUCCESS',
    };
  }

  @Get(':id/metadata')
  async getMediaFileMetadata(@Param('id') id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.mediaService.getMediaFileMetadata(id);
  }

  @Get(':id/exists')
  async checkMediaFileExists(@Param('id') id: string) {
    return this.mediaService.checkMediaFileExists(id);
  }

  @Get(':id/scramble-key')
  @Auth()
  async getScrambleKey(@Param('id') id: string) {
    const data = await this.mediaService.getScrambleKey(id);
    return {
      success: true,
      data,
      messageKey: 'media.SCRAMBLE_KEY_SUCCESS',
    };
  }
}
