const winston = require('winston');
const path = require('path');

// 로그 레벨 정의
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 개발/운영 환경별 로그 레벨 설정
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'warn';
};

// 로그 색상 설정
winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
});

// 로그 포맷 설정
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// 파일용 로그 포맷 (색상 없음)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// 로그 전송 설정
const transports = [
  // 콘솔 출력
  new winston.transports.Console({
    format,
    level: level(),
  }),
  
  // 에러 로그 파일
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // 모든 로그 파일
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Winston 로거 생성
const logger = winston.createLogger({
  level: level(),
  levels: logLevels,
  transports,
  // 처리되지 않은 예외 및 Promise rejection 처리
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
      format: fileFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
      format: fileFormat,
    }),
  ],
});

// 개발 환경에서는 처리되지 않은 예외 시 프로세스 종료하지 않음
if (process.env.NODE_ENV !== 'production') {
  logger.exitOnError = false;
}

// 로그 헬퍼 메서드 추가
logger.logRequest = (req, message = 'Request received') => {
  logger.info(`${message}`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
};

logger.logResponse = (req, res, message = 'Response sent') => {
  logger.info(`${message}`, {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: res.get('X-Response-Time'),
    timestamp: new Date().toISOString()
  });
};

logger.logError = (error, context = {}) => {
  logger.error('Application Error:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    context,
    timestamp: new Date().toISOString()
  });
};

logger.logAIRequest = (userMessage, userId, intent) => {
  logger.info('AI Request:', {
    userMessage: userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : ''),
    userId,
    intent,
    timestamp: new Date().toISOString()
  });
};

logger.logAIResponse = (response, userId, processingTime) => {
  logger.info('AI Response:', {
    responseLength: response.length,
    userId,
    processingTime: `${processingTime}ms`,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;