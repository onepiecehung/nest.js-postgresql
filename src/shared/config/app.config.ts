export const appConfig = () => ({
  port: Number(process.env.APP_PORT) || 3000,
  timezone: process.env.TZ || 'UTC',
  jwt: {
    secret: process.env.JWT_SECRET || 'victory_secret_key',
    accessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '1h',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
  i18n: {
    fallbackLanguage: process.env.I18N_FALLBACK_LANGUAGE || 'en',
    supportedLanguages: process.env.I18N_SUPPORTED_LANGUAGES || 'en,vi',
  },
  qr: {
    hmacSecret: process.env.QR_HMAC_SECRET,
    ticketTtlSeconds: Number(process.env.QR_TICKET_TTL_SECONDS) || 180,
    grantTtlSeconds: Number(process.env.QR_GRANT_TTL_SECONDS) || 30,
  },
  cursor: {
    hmacSecret: process.env.CURSOR_HMAC_SECRET,
  },
  ws: {
    isAdapterEnabled: process.env.WS_ADAPTER_ENABLED || false,
  },
  imageScrambler: {
    enabled: process.env.IMAGE_SCRAMBLER_ENABLED === 'true',
    masterKey:
      process.env.IMAGE_SCRAMBLER_MASTER_KEY ||
      'dev_image_scrambler_master_key',
    tileRows: Number(process.env.IMAGE_SCRAMBLER_TILE_ROWS) || 24,
    tileCols: Number(process.env.IMAGE_SCRAMBLER_TILE_COLS) || 12,
    version: 1,
    // HKDF context string for key derivation (must be same for scramble and unscramble)
    contextString:
      process.env.IMAGE_SCRAMBLER_CONTEXT_STRING || 'jai-image-scramble-v1',
    // Time-based rotation: seed changes every N seconds (0 = disabled, seed never changes)
    // Example: 3600 = seed changes every hour, 86400 = every day
    rotationDurationSeconds:
      Number(process.env.IMAGE_SCRAMBLER_ROTATION_DURATION_SECONDS) || 0,
  },
});
