import { instanceToPlain } from 'class-transformer';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { Segments } from 'src/series/entities/segments.entity';
import { MEDIA_CONSTANTS, MediaStatus, MediaType } from 'src/shared/constants';
import { BaseEntityCustom } from 'src/shared/entities/base.entity';
import { User } from 'src/users/entities/user.entity';

@Entity({
  name: 'media',
})
export class Media extends BaseEntityCustom {
  @Index()
  @Column({
    type: 'enum',
    enum: MEDIA_CONSTANTS.STATUS,
    default: MEDIA_CONSTANTS.STATUS.INACTIVE,
  })
  status: MediaStatus;

  @Column({
    type: 'varchar',
    length: MEDIA_CONSTANTS.NAME_MAX_LENGTH,
    nullable: false,
  })
  name: string;

  @Column({
    type: 'varchar',
    length: MEDIA_CONSTANTS.TITLE_MAX_LENGTH,
    nullable: true,
  })
  title: string;

  @Column({
    type: 'varchar',
    length: MEDIA_CONSTANTS.ALT_TEXT_MAX_LENGTH,
    nullable: true,
  })
  altText: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  path: string;

  @Column({
    type: 'varchar',
    length: MEDIA_CONSTANTS.MIME_TYPE_MAX_LENGTH,
    nullable: true,
  })
  mimeType: string;

  @Column({
    type: 'varchar',
    length: MEDIA_CONSTANTS.EXTENSION_MAX_LENGTH,
    nullable: true,
  })
  extension: string;

  @Column('bigint', { nullable: true })
  size: number;

  @Column({
    type: 'varchar',
    length: MEDIA_CONSTANTS.DESCRIPTION_MAX_LENGTH,
    nullable: true,
  })
  description: string;

  @Column({
    type: 'enum',
    enum: MEDIA_CONSTANTS.TYPES,
    default: MEDIA_CONSTANTS.TYPES.OTHER,
  })
  type: MediaType;

  @Column('text', { nullable: true })
  url: string;

  @Column('text', { nullable: true })
  key: string;

  @Column('text', { nullable: true })
  originalName: string;

  @Column('text', { nullable: true })
  thumbnailUrl: string;

  @Column('text', { nullable: true })
  previewUrl: string;

  @Column('bigint', { nullable: true, default: null })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: User;

  @Column('text', { nullable: true })
  metadata: string; // JSON string for additional media metadata

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    default: 'local',
  })
  storageProvider: string;

  @Column('int', { nullable: true })
  width: number;

  @Column('int', { nullable: true })
  height: number;

  @Column('int', { nullable: true })
  duration: number; // For video/audio files in seconds

  @Column('int', { nullable: true, default: 0 })
  downloadCount: number;

  @Column('int', { nullable: true, default: 0 })
  viewCount: number;

  @Column('boolean', { default: false })
  isPublic: boolean;

  @Column('text', { nullable: true })
  tags: string; // JSON array of tags

  /**
   * The ID of the segment that the media belongs to
   */
  @Column({ type: 'bigint', nullable: true })
  segmentId: string;

  /**
   * The segment that the media belongs to
   */
  @ManyToOne(() => Segments, { nullable: true })
  @JoinColumn({ name: 'segmentId', referencedColumnName: 'id' })
  segment?: Segments;

  /**
   * Convert entity to JSON with sensitive fields removed
   * @returns {object} Cleaned JSON object
   */
  toJSON() {
    const result = instanceToPlain(this);
    // Remove sensitive fields from JSON response
    delete result.key;
    delete result.path;
    delete result.originalName;
    delete result.userId;
    delete result.metadata;
    return result;
  }

  /**
   * Get media dimensions as string
   * @returns {string} Dimensions string (e.g., "1920x1080")
   */
  getDimensions(): string | null {
    if (this.width && this.height) {
      return `${this.width}x${this.height}`;
    }
    return null;
  }

  /**
   * Get formatted file size
   * @returns {string} Formatted size (e.g., "1.5 MB")
   */
  getFormattedSize(): string | null {
    if (!this.size) return null;

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = this.size;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Check if media is an image
   * @returns {boolean} True if media is an image
   */
  isImage(): boolean {
    return this.type === MEDIA_CONSTANTS.TYPES.IMAGE;
  }

  /**
   * Check if media is a video
   * @returns {boolean} True if media is a video
   */
  isVideo(): boolean {
    return this.type === MEDIA_CONSTANTS.TYPES.VIDEO;
  }

  /**
   * Check if media is an audio file
   * @returns {boolean} True if media is an audio file
   */
  isAudio(): boolean {
    return this.type === MEDIA_CONSTANTS.TYPES.AUDIO;
  }

  /**
   * Check if media is a document
   * @returns {boolean} True if media is a document
   */
  isDocument(): boolean {
    return this.type === MEDIA_CONSTANTS.TYPES.DOCUMENT;
  }
}
