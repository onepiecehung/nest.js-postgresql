/**
 * Permission constants for the Discord-style permission system
 * Re-exports existing permission constants from shared constants
 */
import { PERMISSION_CONSTANTS } from 'src/shared/constants/permission.constants';

// Re-export the existing permission constants for backward compatibility
export const PERMISSIONS = PERMISSION_CONSTANTS.BIT_MASKS;

/**
 * Permission names for human-readable display
 * Maps permission constants to their string names
 */
export const PERMISSION_NAMES = {
  CREATE_INSTANT_INVITE: 'Create Instant Invite',
  KICK_MEMBERS: 'Kick Members',
  BAN_MEMBERS: 'Ban Members',
  ADMINISTRATOR: 'Administrator',
  MANAGE_CHANNELS: 'Manage Channels',
  MANAGE_GUILD: 'Manage Guild',
  ADD_REACTIONS: 'Add Reactions',
  VIEW_AUDIT_LOG: 'View Audit Log',
  PRIORITY_SPEAKER: 'Priority Speaker',
  STREAM: 'Stream',
  VIEW_CHANNEL: 'View Channel',
  SEND_MESSAGES: 'Send Messages',
  SEND_TTS_MESSAGES: 'Send TTS Messages',
  MANAGE_MESSAGES: 'Manage Messages',
  EMBED_LINKS: 'Embed Links',
  ATTACH_FILES: 'Attach Files',
  READ_MESSAGE_HISTORY: 'Read Message History',
  MENTION_EVERYONE: 'Mention Everyone',
  USE_EXTERNAL_EMOJIS: 'Use External Emojis',
  VIEW_GUILD_INSIGHTS: 'View Guild Insights',
  CONNECT: 'Connect',
  SPEAK: 'Speak',
  MUTE_MEMBERS: 'Mute Members',
  DEAFEN_MEMBERS: 'Deafen Members',
  MOVE_MEMBERS: 'Move Members',
  USE_VAD: 'Use VAD',
  CHANGE_NICKNAME: 'Change Nickname',
  MANAGE_NICKNAMES: 'Manage Nicknames',
  MANAGE_ROLES: 'Manage Roles',
  MANAGE_WEBHOOKS: 'Manage Webhooks',
  MANAGE_EMOJIS_AND_STICKERS: 'Manage Emojis and Stickers',
  USE_SLASH_COMMANDS: 'Use Slash Commands',
  REQUEST_TO_SPEAK: 'Request to Speak',
  ARTICLE_CREATE: 'Create Articles',
  ARTICLE_EDIT: 'Edit Articles',
  ARTICLE_DELETE: 'Delete Articles',
  ARTICLE_PUBLISH: 'Publish Articles',
  ARTICLE_VIEW_DRAFTS: 'View Draft Articles',
  ARTICLE_MANAGE_ALL: 'Manage All Articles',
  ORGANIZATION_MANAGE_MEMBERS: 'Manage Organization Members',
  ORGANIZATION_MANAGE_SETTINGS: 'Manage Organization Settings',
  ORGANIZATION_DELETE: 'Delete Organization',
  ORGANIZATION_VIEW_ANALYTICS: 'View Organization Analytics',
  ORGANIZATION_INVITE_MEMBERS: 'Invite Organization Members',
  COMMENT_CREATE: 'Create Comments',
  COMMENT_EDIT: 'Edit Comments',
  COMMENT_DELETE: 'Delete Comments',
  COMMENT_MODERATE: 'Moderate Comments',
  USER_MANAGE_PROFILE: 'Manage User Profile',
  USER_VIEW_ANALYTICS: 'View User Analytics',
  SYSTEM_MANAGE_ALL_ORGANIZATIONS: 'Manage All Organizations',
  SYSTEM_VIEW_ALL_ANALYTICS: 'View All Analytics',
  SYSTEM_MANAGE_USERS: 'Manage Users',
} as const;

/**
 * Default role names for the system
 */
export const DEFAULT_ROLES = {
  EVERYONE: 'everyone',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member',
  OWNER: 'owner',
} as const;

/**
 * Permission calculation result interface
 */
export interface EffectivePermissions {
  /** The computed permission mask as BigInt */
  mask: bigint;
  /** Boolean map of individual permissions for easy checking */
  map: Record<string, boolean>;
}
