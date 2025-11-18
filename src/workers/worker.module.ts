import { Module } from '@nestjs/common';

import { AnalyticsModule } from 'src/analytics/analytics.module';
import { CommentsModule } from 'src/comments/comments.module';
import { SeriesModule } from 'src/series/series.module';
import { ShareModule } from 'src/share/share.module';
import { MailModule } from 'src/shared/services/mail/mail.module';
import { WorkerController } from './worker.controller';
import { WorkerService } from './worker.service';

@Module({
  imports: [
    MailModule,
    CommentsModule,
    ShareModule,
    AnalyticsModule,
    SeriesModule,
  ],
  controllers: [WorkerController],
  providers: [WorkerService],
})
export class WorkerModule {}
