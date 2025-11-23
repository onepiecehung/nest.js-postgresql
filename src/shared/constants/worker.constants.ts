export const JOB_NAME = {
  TEST_RABBIT: 'test_rabbit',
  MAIL_QUEUE: 'mail_queue',
  MAIL_SINGLE: 'mail_single',
  MAIL_BATCH: 'mail_batch',
  MAIL_TEMPLATE: 'mail_template',
  MAIL_OTP: 'mail_otp',
  REACTION_SET: 'reaction_set',
  REACTION_UNSET: 'reaction_unset',
  COMMENT_CREATED: 'comment_created',
  COMMENT_UPDATED: 'comment_updated',
  COMMENT_DELETED: 'comment_deleted',
  COMMENT_PINNED: 'comment_pinned',
  // Report events
  REPORT_CREATED: 'report_created',
  REPORT_UPDATED: 'report_updated',
  REPORT_ACTION_CREATED: 'report_action_created',
  REPORT_ASSIGNED: 'report_assigned',
  REPORT_RESOLVED: 'report_resolved',
  REPORT_DISMISSED: 'report_dismissed',
  REPORT_ESCALATED: 'report_escalated',
  REPORT_MERGED: 'report_merged',
  // Share events
  SHARE_CREATED: 'share_created',
  SHARE_DELETED: 'share_deleted',
  SHARE_COUNT_UPDATE: 'share_count_update',
  // Analytics events
  ANALYTICS_TRACK: 'analytics_track',
  // Series events
  SERIES_SAVE: 'series_save',
  SERIES_CRAWL: 'series_crawl',
  SERIES_BATCH_SAVE: 'series_batch_save',
} as const;
