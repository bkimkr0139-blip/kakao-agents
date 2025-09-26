const path = require('path');

/**
 * 애플리케이션 설정 관리
 * 환경변수를 통해 설정값을 관리하고 기본값을 제공
 */
const config = {
  // 환경 설정
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 3000,
  
  // 서버 설정
  server: {
    host: process.env.HOST || 'localhost',
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://builder.kakao.com'],
      credentials: true
    },
    bodyLimit: '10mb',
    timeout: 30000 // 30초
  },

  // OpenAI 설정
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    maxTokens: parseInt(process.env.MAX_TOKENS) || 500,
    temperature: parseFloat(process.env.TEMPERATURE) || 0.7,
    presencePenalty: 0.1,
    frequencyPenalty: 0.1
  },

  // Rate Limiting 설정
  rateLimit: {
    // 일반 요청 제한
    general: {
      points: parseInt(process.env.RATE_LIMIT_POINTS) || 100,
      duration: parseInt(process.env.RATE_LIMIT_DURATION) || 60,
      blockDuration: parseInt(process.env.RATE_LIMIT_BLOCK_DURATION) || 60
    },
    // 사용자별 요청 제한
    user: {
      points: parseInt(process.env.USER_RATE_LIMIT_POINTS) || 30,
      duration: parseInt(process.env.USER_RATE_LIMIT_DURATION) || 60,
      blockDuration: parseInt(process.env.USER_RATE_LIMIT_BLOCK_DURATION) || 30
    }
  },

  // 카카오톡 설정
  kakao: {
    botId: process.env.KAKAO_BOT_ID,
    botName: process.env.KAKAO_BOT_NAME || 'Business Support Agent',
    version: '2.0', // KakaoTalk API 버전
    webhookPath: '/webhook/kakaotalk',
    maxMessageLength: 1000
  },

  // AI 대화 설정
  conversation: {
    maxHistoryLength: 20, // 대화 히스토리 최대 길이
    sessionTimeout: parseInt(process.env.CONVERSATION_TIMEOUT) || 3600000, // 1시간
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'ko',
    maxQuickReplies: 3
  },

  // 로깅 설정
  logging: {
    level: process.env.LOG_LEVEL || (config.env === 'development' ? 'debug' : 'warn'),
    dir: path.join(process.cwd(), 'logs'),
    maxSize: 5242880, // 5MB
    maxFiles: 5,
    datePattern: 'YYYY-MM-DD',
    format: {
      console: 'YYYY-MM-DD HH:mm:ss:ms',
      file: 'YYYY-MM-DD HH:mm:ss:ms'
    }
  },

  // 보안 설정
  security: {
    sessionSecret: process.env.SESSION_SECRET || 'default-session-secret-change-this',
    adminBypassToken: process.env.ADMIN_BYPASS_TOKEN,
    encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this'
  },

  // 데이터베이스 설정 (향후 확장)
  database: {
    mongodb: {
      url: process.env.DATABASE_URL || 'mongodb://localhost:27017/kakaotalk-agent',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      }
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      options: {
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null
      }
    }
  },

  // 외부 API 설정 (향후 확장)
  external: {
    company: {
      baseUrl: process.env.COMPANY_API_BASE_URL,
      apiKey: process.env.COMPANY_API_KEY,
      timeout: 10000 // 10초
    }
  },

  // 모니터링 설정
  monitoring: {
    sentry: {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV
    },
    newrelic: {
      licenseKey: process.env.NEWRELIC_LICENSE_KEY,
      appName: 'KakaoTalk Business Agent'
    }
  },

  // 개발 환경 설정
  development: {
    enableDebugLogs: true,
    mockExternalAPIs: false,
    bypassRateLimit: false
  },

  // 운영 환경 설정
  production: {
    enableDebugLogs: false,
    mockExternalAPIs: false,
    bypassRateLimit: false,
    forceHTTPS: true,
    enableCompression: true
  }
};

// 환경별 설정 오버라이드
if (config.env === 'development') {
  Object.assign(config, config.development);
} else if (config.env === 'production') {
  Object.assign(config, config.production);
}

// 설정 검증
const validateConfig = () => {
  const required = [
    'openai.apiKey'
  ];

  const missing = [];
  
  for (const path of required) {
    const keys = path.split('.');
    let value = config;
    
    for (const key of keys) {
      value = value[key];
      if (value === undefined) {
        missing.push(path);
        break;
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
};

// 개발 환경이 아닌 경우에만 필수 설정 검증
if (config.env !== 'development') {
  validateConfig();
}

module.exports = config;