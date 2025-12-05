// Permission Constants for Organization Management System (Discord-style bitfield)
export const PERMISSION_CONSTANTS = {
  // Permission bit positions (0-63 for 64-bit integer)
  // General Permissions
  CREATE_INSTANT_INVITE: 0n, // Allows creation of instant invites
  KICK_MEMBERS: 1n, // Allows kicking members
  BAN_MEMBERS: 2n, // Allows banning members
  ADMINISTRATOR: 3n, // Allows all permissions and bypasses channel permission overwrites
  MANAGE_CHANNELS: 4n, // Allows management and editing of channels
  MANAGE_GUILD: 5n, // Allows management and editing of the server
  ADD_REACTIONS: 6n, // Allows for the addition of reactions to messages
  VIEW_AUDIT_LOG: 7n, // Allows for viewing of audit logs
  PRIORITY_SPEAKER: 8n, // Allows for using priority speaker in a voice channel
  STREAM: 9n, // Allows the user to go live
  VIEW_CHANNEL: 10n, // Allows guild members to view a channel, which includes reading messages in text channels
  SEND_MESSAGES: 11n, // Allows for sending messages in a channel
  SEND_TTS_MESSAGES: 12n, // Allows for sending of /tts messages
  MANAGE_MESSAGES: 13n, // Allows for deletion of other users messages
  EMBED_LINKS: 14n, // Links sent by users with this permission will be auto-embedded
  ATTACH_FILES: 15n, // Allows for uploading images and files
  READ_MESSAGE_HISTORY: 16n, // Allows for reading of message history
  MENTION_EVERYONE: 17n, // Allows for using the @everyone tag to notify all users in a channel
  USE_EXTERNAL_EMOJIS: 18n, // Allows the usage of custom emojis from other servers
  VIEW_GUILD_INSIGHTS: 19n, // Allows for viewing guild insights
  CONNECT: 20n, // Allows for joining of a voice channel
  SPEAK: 21n, // Allows for speaking in a voice channel
  MUTE_MEMBERS: 22n, // Allows for muting members in a voice channel
  DEAFEN_MEMBERS: 23n, // Allows for deafening of members in a voice channel
  MOVE_MEMBERS: 24n, // Allows for moving of members between voice channels
  USE_VAD: 25n, // Allows for using voice-activity-detection in a voice channel
  CHANGE_NICKNAME: 26n, // Allows for modification of own nickname
  MANAGE_NICKNAMES: 27n, // Allows for modification of other users nicknames
  MANAGE_ROLES: 28n, // Allows management and editing of roles
  MANAGE_WEBHOOKS: 29n, // Allows management and editing of webhooks
  MANAGE_EMOJIS_AND_STICKERS: 30n, // Allows management and editing of emojis and stickers
  USE_SLASH_COMMANDS: 31n, // Allows members to use slash commands in text channels
  REQUEST_TO_SPEAK: 32n, // Allows for requesting to speak in stage channels

  // Article-specific permissions (custom for our system)
  ARTICLE_CREATE: 33n, // Allows creating articles
  ARTICLE_EDIT: 34n, // Allows editing articles
  ARTICLE_DELETE: 35n, // Allows deleting articles
  ARTICLE_PUBLISH: 36n, // Allows publishing articles
  ARTICLE_VIEW_DRAFTS: 37n, // Allows viewing draft articles
  ARTICLE_MANAGE_ALL: 38n, // Allows managing all articles (admin override)

  // Organization-specific permissions (custom for our system)
  ORGANIZATION_MANAGE_MEMBERS: 39n, // Allows managing organization members
  ORGANIZATION_MANAGE_SETTINGS: 40n, // Allows managing organization settings
  ORGANIZATION_DELETE: 41n, // Allows deleting organization
  ORGANIZATION_VIEW_ANALYTICS: 42n, // Allows viewing organization analytics
  ORGANIZATION_INVITE_MEMBERS: 43n, // Allows inviting members to organization

  // Comment permissions (custom for our system)
  COMMENT_CREATE: 44n, // Allows creating comments
  COMMENT_EDIT: 45n, // Allows editing comments
  COMMENT_DELETE: 46n, // Allows deleting comments
  COMMENT_MODERATE: 47n, // Allows moderating comments

  // User permissions (custom for our system)
  USER_MANAGE_PROFILE: 48n, // Allows managing user profile
  USER_VIEW_ANALYTICS: 49n, // Allows viewing user analytics

  // System permissions (custom for our system)
  SYSTEM_MANAGE_ALL_ORGANIZATIONS: 50n, // Allows managing all organizations
  SYSTEM_VIEW_ALL_ANALYTICS: 51n, // Allows viewing all analytics
  SYSTEM_MANAGE_USERS: 52n, // Allows managing users

  // Series permissions (custom for our system)
  SERIES_CREATE: 53n, // Allows creating series
  SERIES_UPDATE: 54n, // Allows updating series

  // Segments permissions (custom for our system)
  SEGMENTS_CREATE: 55n, // Allows creating segments
  SEGMENTS_UPDATE: 56n, // Allows updating segments

  // Permission categories for better organization
  CATEGORIES: {
    GENERAL: 'general',
    ARTICLE: 'article',
    ORGANIZATION: 'organization',
    COMMENT: 'comment',
    USER: 'user',
    SYSTEM: 'system',
    SERIES: 'series',
    SEGMENTS: 'segments',
  },

  // All permissions as a single array for easier iteration
  ALL_PERMISSIONS: [
    'CREATE_INSTANT_INVITE',
    'KICK_MEMBERS',
    'BAN_MEMBERS',
    'ADMINISTRATOR',
    'MANAGE_CHANNELS',
    'MANAGE_GUILD',
    'ADD_REACTIONS',
    'VIEW_AUDIT_LOG',
    'PRIORITY_SPEAKER',
    'STREAM',
    'VIEW_CHANNEL',
    'SEND_MESSAGES',
    'SEND_TTS_MESSAGES',
    'MANAGE_MESSAGES',
    'EMBED_LINKS',
    'ATTACH_FILES',
    'READ_MESSAGE_HISTORY',
    'MENTION_EVERYONE',
    'USE_EXTERNAL_EMOJIS',
    'VIEW_GUILD_INSIGHTS',
    'CONNECT',
    'SPEAK',
    'MUTE_MEMBERS',
    'DEAFEN_MEMBERS',
    'MOVE_MEMBERS',
    'USE_VAD',
    'CHANGE_NICKNAME',
    'MANAGE_NICKNAMES',
    'MANAGE_ROLES',
    'MANAGE_WEBHOOKS',
    'MANAGE_EMOJIS_AND_STICKERS',
    'USE_SLASH_COMMANDS',
    'REQUEST_TO_SPEAK',
    'ARTICLE_CREATE',
    'ARTICLE_EDIT',
    'ARTICLE_DELETE',
    'ARTICLE_PUBLISH',
    'ARTICLE_VIEW_DRAFTS',
    'ARTICLE_MANAGE_ALL',
    'ORGANIZATION_MANAGE_MEMBERS',
    'ORGANIZATION_MANAGE_SETTINGS',
    'ORGANIZATION_DELETE',
    'ORGANIZATION_VIEW_ANALYTICS',
    'ORGANIZATION_INVITE_MEMBERS',
    'COMMENT_CREATE',
    'COMMENT_EDIT',
    'COMMENT_DELETE',
    'COMMENT_MODERATE',
    'USER_MANAGE_PROFILE',
    'USER_VIEW_ANALYTICS',
    'SYSTEM_MANAGE_ALL_ORGANIZATIONS',
    'SYSTEM_VIEW_ALL_ANALYTICS',
    'SYSTEM_MANAGE_USERS',
    'SERIES_CREATE',
    'SERIES_UPDATE',
    'SEGMENTS_CREATE',
    'SEGMENTS_UPDATE',
  ],

  // Permission bit masks (pre-calculated for performance)
  BIT_MASKS: {
    CREATE_INSTANT_INVITE: 1n << 0n,
    KICK_MEMBERS: 1n << 1n,
    BAN_MEMBERS: 1n << 2n,
    ADMINISTRATOR: 1n << 3n,
    MANAGE_CHANNELS: 1n << 4n,
    MANAGE_GUILD: 1n << 5n,
    ADD_REACTIONS: 1n << 6n,
    VIEW_AUDIT_LOG: 1n << 7n,
    PRIORITY_SPEAKER: 1n << 8n,
    STREAM: 1n << 9n,
    VIEW_CHANNEL: 1n << 10n,
    SEND_MESSAGES: 1n << 11n,
    SEND_TTS_MESSAGES: 1n << 12n,
    MANAGE_MESSAGES: 1n << 13n,
    EMBED_LINKS: 1n << 14n,
    ATTACH_FILES: 1n << 15n,
    READ_MESSAGE_HISTORY: 1n << 16n,
    MENTION_EVERYONE: 1n << 17n,
    USE_EXTERNAL_EMOJIS: 1n << 18n,
    VIEW_GUILD_INSIGHTS: 1n << 19n,
    CONNECT: 1n << 20n,
    SPEAK: 1n << 21n,
    MUTE_MEMBERS: 1n << 22n,
    DEAFEN_MEMBERS: 1n << 23n,
    MOVE_MEMBERS: 1n << 24n,
    USE_VAD: 1n << 25n,
    CHANGE_NICKNAME: 1n << 26n,
    MANAGE_NICKNAMES: 1n << 27n,
    MANAGE_ROLES: 1n << 28n,
    MANAGE_WEBHOOKS: 1n << 29n,
    MANAGE_EMOJIS_AND_STICKERS: 1n << 30n,
    USE_SLASH_COMMANDS: 1n << 31n,
    REQUEST_TO_SPEAK: 1n << 32n,
    ARTICLE_CREATE: 1n << 33n,
    ARTICLE_EDIT: 1n << 34n,
    ARTICLE_DELETE: 1n << 35n,
    ARTICLE_PUBLISH: 1n << 36n,
    ARTICLE_VIEW_DRAFTS: 1n << 37n,
    ARTICLE_MANAGE_ALL: 1n << 38n,
    ORGANIZATION_MANAGE_MEMBERS: 1n << 39n,
    ORGANIZATION_MANAGE_SETTINGS: 1n << 40n,
    ORGANIZATION_DELETE: 1n << 41n,
    ORGANIZATION_VIEW_ANALYTICS: 1n << 42n,
    ORGANIZATION_INVITE_MEMBERS: 1n << 43n,
    COMMENT_CREATE: 1n << 44n,
    COMMENT_EDIT: 1n << 45n,
    COMMENT_DELETE: 1n << 46n,
    COMMENT_MODERATE: 1n << 47n,
    USER_MANAGE_PROFILE: 1n << 48n,
    USER_VIEW_ANALYTICS: 1n << 49n,
    SYSTEM_MANAGE_ALL_ORGANIZATIONS: 1n << 50n,
    SYSTEM_VIEW_ALL_ANALYTICS: 1n << 51n,
    SYSTEM_MANAGE_USERS: 1n << 52n,
    SERIES_CREATE: 1n << 53n,
    SERIES_UPDATE: 1n << 54n,
    SEGMENTS_CREATE: 1n << 55n,
    SEGMENTS_UPDATE: 1n << 56n,
  },
} as const;

// Default permissions for each organization role (bitfield values)
export const DEFAULT_ROLE_PERMISSIONS_BITFIELD = {
  OWNER:
    PERMISSION_CONSTANTS.BIT_MASKS.ADMINISTRATOR |
    PERMISSION_CONSTANTS.BIT_MASKS.MANAGE_GUILD |
    PERMISSION_CONSTANTS.BIT_MASKS.MANAGE_ROLES |
    PERMISSION_CONSTANTS.BIT_MASKS.MANAGE_CHANNELS |
    PERMISSION_CONSTANTS.BIT_MASKS.KICK_MEMBERS |
    PERMISSION_CONSTANTS.BIT_MASKS.BAN_MEMBERS |
    PERMISSION_CONSTANTS.BIT_MASKS.VIEW_AUDIT_LOG |
    PERMISSION_CONSTANTS.BIT_MASKS.MANAGE_WEBHOOKS |
    PERMISSION_CONSTANTS.BIT_MASKS.MANAGE_EMOJIS_AND_STICKERS |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_CREATE |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_EDIT |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_DELETE |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_PUBLISH |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_VIEW_DRAFTS |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_MANAGE_ALL |
    PERMISSION_CONSTANTS.BIT_MASKS.ORGANIZATION_MANAGE_MEMBERS |
    PERMISSION_CONSTANTS.BIT_MASKS.ORGANIZATION_MANAGE_SETTINGS |
    PERMISSION_CONSTANTS.BIT_MASKS.ORGANIZATION_DELETE |
    PERMISSION_CONSTANTS.BIT_MASKS.ORGANIZATION_VIEW_ANALYTICS |
    PERMISSION_CONSTANTS.BIT_MASKS.ORGANIZATION_INVITE_MEMBERS |
    PERMISSION_CONSTANTS.BIT_MASKS.COMMENT_CREATE |
    PERMISSION_CONSTANTS.BIT_MASKS.COMMENT_EDIT |
    PERMISSION_CONSTANTS.BIT_MASKS.COMMENT_DELETE |
    PERMISSION_CONSTANTS.BIT_MASKS.COMMENT_MODERATE |
    PERMISSION_CONSTANTS.BIT_MASKS.USER_MANAGE_PROFILE |
    PERMISSION_CONSTANTS.BIT_MASKS.USER_VIEW_ANALYTICS |
    PERMISSION_CONSTANTS.BIT_MASKS.SYSTEM_MANAGE_ALL_ORGANIZATIONS |
    PERMISSION_CONSTANTS.BIT_MASKS.SYSTEM_VIEW_ALL_ANALYTICS |
    PERMISSION_CONSTANTS.BIT_MASKS.SYSTEM_MANAGE_USERS |
    PERMISSION_CONSTANTS.BIT_MASKS.SERIES_CREATE |
    PERMISSION_CONSTANTS.BIT_MASKS.SERIES_UPDATE |
    PERMISSION_CONSTANTS.BIT_MASKS.SEGMENTS_CREATE |
    PERMISSION_CONSTANTS.BIT_MASKS.SEGMENTS_UPDATE,
  ADMIN:
    PERMISSION_CONSTANTS.BIT_MASKS.MANAGE_ROLES |
    PERMISSION_CONSTANTS.BIT_MASKS.MANAGE_CHANNELS |
    PERMISSION_CONSTANTS.BIT_MASKS.KICK_MEMBERS |
    PERMISSION_CONSTANTS.BIT_MASKS.BAN_MEMBERS |
    PERMISSION_CONSTANTS.BIT_MASKS.VIEW_AUDIT_LOG |
    PERMISSION_CONSTANTS.BIT_MASKS.MANAGE_WEBHOOKS |
    PERMISSION_CONSTANTS.BIT_MASKS.MANAGE_MESSAGES |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_CREATE |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_EDIT |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_PUBLISH |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_VIEW_DRAFTS |
    PERMISSION_CONSTANTS.BIT_MASKS.ORGANIZATION_MANAGE_MEMBERS |
    PERMISSION_CONSTANTS.BIT_MASKS.ORGANIZATION_VIEW_ANALYTICS |
    PERMISSION_CONSTANTS.BIT_MASKS.ORGANIZATION_INVITE_MEMBERS |
    PERMISSION_CONSTANTS.BIT_MASKS.COMMENT_CREATE |
    PERMISSION_CONSTANTS.BIT_MASKS.COMMENT_EDIT |
    PERMISSION_CONSTANTS.BIT_MASKS.COMMENT_DELETE |
    PERMISSION_CONSTANTS.BIT_MASKS.COMMENT_MODERATE |
    PERMISSION_CONSTANTS.BIT_MASKS.USER_MANAGE_PROFILE,
  MEMBER:
    PERMISSION_CONSTANTS.BIT_MASKS.VIEW_CHANNEL |
    PERMISSION_CONSTANTS.BIT_MASKS.SEND_MESSAGES |
    PERMISSION_CONSTANTS.BIT_MASKS.EMBED_LINKS |
    PERMISSION_CONSTANTS.BIT_MASKS.ATTACH_FILES |
    PERMISSION_CONSTANTS.BIT_MASKS.READ_MESSAGE_HISTORY |
    PERMISSION_CONSTANTS.BIT_MASKS.ADD_REACTIONS |
    PERMISSION_CONSTANTS.BIT_MASKS.USE_EXTERNAL_EMOJIS |
    PERMISSION_CONSTANTS.BIT_MASKS.USE_SLASH_COMMANDS |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_CREATE |
    PERMISSION_CONSTANTS.BIT_MASKS.ARTICLE_EDIT |
    PERMISSION_CONSTANTS.BIT_MASKS.COMMENT_CREATE |
    PERMISSION_CONSTANTS.BIT_MASKS.COMMENT_EDIT |
    PERMISSION_CONSTANTS.BIT_MASKS.USER_MANAGE_PROFILE,
} as const;

// Type definitions for better TypeScript support
export type PermissionBitfield = bigint;

export type PermissionCategory =
  (typeof PERMISSION_CONSTANTS.CATEGORIES)[keyof typeof PERMISSION_CONSTANTS.CATEGORIES];

// OrganizationMemberRole type is defined in organization.constants.ts to avoid naming conflicts

export type PermissionScope = 'global' | 'organization' | 'user';

export type PermissionOverwriteType = 'role' | 'member';

export type PermissionOverwriteAction = 'allow' | 'deny' | 'inherit';

export type PermissionAction = string;

// Helper types for easier usage
export type PermissionName =
  (typeof PERMISSION_CONSTANTS.ALL_PERMISSIONS)[number];

// Utility type to get permission bit from name
export type GetPermissionBit<T extends PermissionName> =
  (typeof PERMISSION_CONSTANTS.BIT_MASKS)[T];
