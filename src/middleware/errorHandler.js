const logger = require('../utils/logger');
const kakaoService = require('../services/kakaoService');

/**
 * 404 Not Found 핸들러
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

/**
 * 전역 에러 핸들러
 */
const errorHandler = (error, req, res, next) => {
  // 에러 로깅
  logger.logError(error, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body
  });

  // 기본 상태 코드 설정
  let statusCode = error.status || error.statusCode || 500;
  let message = error.message || 'Internal Server Error';

  // 개발 환경에서는 스택 트레이스 포함
  const isDevelopment = process.env.NODE_ENV === 'development';

  // KakaoTalk 웹훅 요청인 경우 KakaoTalk 형식으로 에러 응답
  if (req.path.includes('/webhook/kakaotalk')) {
    return res.status(200).json(
      kakaoService.createErrorResponse(
        message,
        '죄송합니다. 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      )
    );
  }

  // 특정 에러 타입별 처리
  switch (error.name) {
    case 'ValidationError':
      statusCode = 400;
      message = '입력 데이터가 올바르지 않습니다.';
      break;
    
    case 'UnauthorizedError':
    case 'JsonWebTokenError':
      statusCode = 401;
      message = '인증이 필요합니다.';
      break;
    
    case 'ForbiddenError':
      statusCode = 403;
      message = '접근 권한이 없습니다.';
      break;
    
    case 'NotFoundError':
      statusCode = 404;
      message = '요청한 리소스를 찾을 수 없습니다.';
      break;
    
    case 'TimeoutError':
      statusCode = 408;
      message = '요청 시간이 초과되었습니다.';
      break;
    
    case 'TooManyRequestsError':
      statusCode = 429;
      message = '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
      break;

    // MongoDB/Database 에러
    case 'MongoError':
    case 'MongooseError':
      statusCode = 500;
      message = '데이터베이스 오류가 발생했습니다.';
      break;

    // OpenAI API 에러
    case 'APIError':
      if (error.status === 429) {
        statusCode = 429;
        message = 'AI 서비스 요청 한도를 초과했습니다.';
      } else if (error.status === 401) {
        statusCode = 500;
        message = 'AI 서비스 인증 오류입니다.';
      } else {
        statusCode = 500;
        message = 'AI 서비스 오류가 발생했습니다.';
      }
      break;

    default:
      // 운영 환경에서는 내부 에러 메시지 숨김
      if (!isDevelopment && statusCode === 500) {
        message = '서버 내부 오류가 발생했습니다.';
      }
  }

  // 에러 응답 객체 구성
  const errorResponse = {
    success: false,
    error: {
      message,
      status: statusCode,
      timestamp: new Date().toISOString()
    }
  };

  // 개발 환경에서는 추가 정보 제공
  if (isDevelopment) {
    errorResponse.error.stack = error.stack;
    errorResponse.error.details = error.details || null;
  }

  // 요청 ID가 있는 경우 포함
  if (req.id) {
    errorResponse.error.requestId = req.id;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * 비동기 함수 에러 처리 래퍼
 * 비동기 함수에서 발생하는 에러를 자동으로 next()로 전달
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 커스텀 에러 클래스들
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = '입력 데이터가 올바르지 않습니다.') {
    super(message, 400);
  }
}

class NotFoundError extends AppError {
  constructor(message = '요청한 리소스를 찾을 수 없습니다.') {
    super(message, 404);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = '인증이 필요합니다.') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = '접근 권한이 없습니다.') {
    super(message, 403);
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = '요청이 너무 많습니다.') {
    super(message, 429);
  }
}

module.exports = {
  notFoundHandler,
  errorHandler,
  asyncHandler,
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  TooManyRequestsError
};