import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Application configuration
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  TZ: Joi.string().default('UTC'),

  // JWT configuration
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TOKEN_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),

  // I18n configuration
  I18N_FALLBACK_LANGUAGE: Joi.string().default('en'),
  I18N_SUPPORTED_LANGUAGES: Joi.string().default('en,vi'),

  // QR HMAC secret
  QR_HMAC_SECRET: Joi.string().required(),
  CURSOR_HMAC_SECRET: Joi.string().required(),

  // QR configuration
  QR_TICKET_TTL_SECONDS: Joi.number().min(60).max(600).default(180),
  QR_GRANT_TTL_SECONDS: Joi.number().min(10).max(120).default(30),

  // Database configuration
  DATABASE_TYPE: Joi.string().valid('postgres').default('postgres'),
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().allow('', null),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_URL: Joi.string().uri().required(),
  DATABASE_SYNCHRONIZE: Joi.boolean().default(false),

  // Redis configuration
  REDIS_URL: Joi.string().uri().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('', null),
  REDIS_DB: Joi.number().min(0).max(15).default(0),

  // RabbitMQ configuration
  RABBITMQ_URL: Joi.string().uri().required(),
  RABBITMQ_QUEUE: Joi.string().required(),
  RABBITMQ_USERNAME: Joi.string().optional(),
  RABBITMQ_PASSWORD: Joi.string().optional(),

  // CORS configuration
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

  // Rate limiting
  RATE_LIMIT_TTL: Joi.number().default(60),
  RATE_LIMIT_LIMIT: Joi.number().default(100),

  // Dynamic rate limiting
  RATE_LIMIT_REDIS_URL: Joi.string().uri().optional(),
  RATE_LIMIT_CACHE_TTL: Joi.number().default(300), // 5 minutes
  RATE_LIMIT_ENABLED: Joi.boolean().default(true),
  RATE_LIMIT_DEFAULT_PLAN: Joi.string().default('anonymous'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),

  // Security
  // SESSION_SECRET: Joi.string().min(32).required(),
  // COOKIE_SECRET: Joi.string().min(32).required(),

  // External services (commented out but properly structured)
  // KAKAO_AUTH_ACCESS_LINK: Joi.string().uri().optional(),
  // NAVER_AUTH_ACCESS_LINK: Joi.string().uri().optional(),

  // Mail configuration
  MAIL_HOST: Joi.string().hostname().default('smtp.gmail.com'),
  MAIL_PORT: Joi.number().port().default(587),
  MAIL_SECURE: Joi.boolean().default(false),
  MAIL_USER: Joi.string().email().required(),
  MAIL_PASS: Joi.string().required(),
  MAIL_FROM: Joi.string().email().required(),
  MAIL_ADMIN: Joi.string().email().required(),
  MAIL_SUPPORT: Joi.string().email().optional(),

  // Mail template configuration
  APP_NAME: Joi.string().default('NestJS App'),
  APP_URL: Joi.string().uri().default('http://localhost:3000'),
  COMPANY_NAME: Joi.string().default('Your Company'),
  COMPANY_ADDRESS: Joi.string().default('Your Address'),

  // AWS configuration
  // AWS_BUCKET_NAME: Joi.string().optional(),
  // AWS_ACCESS_KEY: Joi.string().optional(),
  // AWS_SECRET_KEY: Joi.string().optional(),
  // AWS_REGION: Joi.string().optional(),
  // AWS_ENDPOINT: Joi.string().uri().optional(),

  // Apple OAuth configuration
  // APPLE_AUTH_KEY_URL: Joi.string().uri().optional(),
  // APPLE_URL: Joi.string().uri().optional(),
  // APPLE_CLIENT_ID: Joi.string().optional(),

  // AniList OAuth configuration (optional - for authenticated requests)
  ANILIST_CLIENT_ID: Joi.string().optional(),
  ANILIST_CLIENT_SECRET: Joi.string().optional(),
  ANILIST_REDIRECT_URI: Joi.string().uri().optional(),

  // WebSocket configuration
  WS_ADAPTER_ENABLED: Joi.boolean().default(false),

  // Sticker configuration
  STICKER_MAX_SIZE: Joi.number().default(524288), // 512KB
  STICKER_RECOMMENDED_SIDE: Joi.number().default(320),
  STICKER_MAX_SIDE: Joi.number().default(1024),
  STICKER_MAX_DURATION_MS: Joi.number().default(5000),
  MEDIA_STICKER_FOLDER: Joi.string().default('stickers'),

  // Firebase configuration
  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_PRIVATE_KEY_ID: Joi.string().required(),
  FIREBASE_PRIVATE_KEY: Joi.string().required(),
  FIREBASE_CLIENT_EMAIL: Joi.string().required(),
  FIREBASE_CLIENT_ID: Joi.string().required(),
  FIREBASE_CLIENT_X509_CERT_URL: Joi.string().required(),
});
