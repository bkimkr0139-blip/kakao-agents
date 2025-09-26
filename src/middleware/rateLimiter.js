const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('../utils/logger');

// 기본 레이트 리미터 설정
const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'kakao_webhook',
  points: parseInt(process.env.RATE_LIMIT_POINTS) || 100, // 요청 수
  duration: parseInt(process.env.RATE_LIMIT_DURATION) || 60, // 초 단위
  blockDuration: parseInt(process.env.RATE_LIMIT_BLOCK_DURATION) || 60, // 차단 지속 시간
});

// 사용자별 레이트 리미터 (더 관대한 설정)
const userRateLimiter = new RateLimiterMemory({
  keyPrefix: 'user_requests',
  points: parseInt(process.env.USER_RATE_LIMIT_POINTS) || 30, // 사용자당 30회
  duration: parseInt(process.env.USER_RATE_LIMIT_DURATION) || 60, // 1분
  blockDuration: parseInt(process.env.USER_RATE_LIMIT_BLOCK_DURATION) || 30, // 30초 차단
});

/**
 * 기본 레이트 리미터 미들웨어
 */
const rateLimiterMiddleware = async (req, res, next) => {
  try {
    // IP 기반 레이트 리미팅
    const key = req.ip;
    await rateLimiter.consume(key);
    
    next();
  } catch (rejRes) {
    // 차단된 요청 로깅
    logger.warn('Rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('User-Agent'),
      remainingPoints: rejRes.remainingPoints,
      msBeforeNext: rejRes.msBeforeNext,
      totalHits: rejRes.totalHits
    });

    // KakaoTalk 웹훅 요청인 경우 200 상태코드로 응답 (카카오 재시도 방지)
    if (req.path.includes('/webhook/kakaotalk')) {
      return res.status(200).json({
        version: '2.0',
        template: {
          outputs: [
            {
              simpleText: {
                text: '죄송합니다. 현재 요청이 많아 잠시 후 다시 시도해 주세요.'
              }
            }
          ]
        }
      });
    }

    // 일반 API 요청인 경우 429 상태코드
    res.status(429).json({
      success: false,
      error: {
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
        retryAfter: Math.round(rejRes.msBeforeNext / 1000) || 1
      }
    });
  }
};

/**
 * 사용자별 레이트 리미터 미들웨어
 */
const userRateLimiterMiddleware = async (req, res, next) => {
  try {
    // 사용자 ID 추출 (KakaoTalk userRequest에서)
    const userId = req.body?.userRequest?.user?.id;
    
    if (!userId) {
      return next(); // 사용자 ID가 없으면 스킵
    }

    const key = `user_${userId}`;
    await userRateLimiter.consume(key);
    
    next();
  } catch (rejRes) {
    // 사용자별 차단 로깅
    logger.warn('User rate limit exceeded:', {
      userId: req.body?.userRequest?.user?.id,
      ip: req.ip,
      remainingPoints: rejRes.remainingPoints,
      msBeforeNext: rejRes.msBeforeNext
    });

    // 사용자별 차단 메시지
    res.status(200).json({
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: '잠시만 기다려 주세요. 너무 많은 요청을 보내셨어요. 30초 후 다시 시도해 주세요.'
            }
          }
        ],
        quickReplies: [
          {
            label: '처음으로',
            action: 'message',
            messageText: '처음으로'
          }
        ]
      }
    });
  }
};

/**
 * 관리자 또는 특별 권한 사용자를 위한 우회 미들웨어
 */
const bypassRateLimit = (req, res, next) => {
  // 특별한 헤더나 토큰이 있는 경우 레이트 리미팅 우회
  const bypassToken = req.get('X-Bypass-Rate-Limit');
  const adminToken = process.env.ADMIN_BYPASS_TOKEN;

  if (bypassToken && adminToken && bypassToken === adminToken) {
    logger.info('Rate limit bypassed for admin request:', {
      ip: req.ip,
      url: req.url
    });
    return next();
  }

  // 일반 레이트 리미터 적용
  return rateLimiterMiddleware(req, res, next);
};

/**
 * 레이트 리미터 상태 확인 미들웨어
 */
const getRateLimitStatus = async (req, res) => {
  try {
    const ip = req.ip;
    const userId = req.query.userId;

    const ipStatus = await rateLimiter.get(ip);
    let userStatus = null;

    if (userId) {
      userStatus = await userRateLimiter.get(`user_${userId}`);
    }

    res.json({
      ip: {
        key: ip,
        remainingPoints: ipStatus ? ipStatus.remainingPoints : rateLimiter.points,
        totalHits: ipStatus ? ipStatus.totalHits : 0,
        resetTime: ipStatus ? new Date(Date.now() + ipStatus.msBeforeNext) : null
      },
      user: userStatus ? {
        key: userId,
        remainingPoints: userStatus.remainingPoints,
        totalHits: userStatus.totalHits,
        resetTime: new Date(Date.now() + userStatus.msBeforeNext)
      } : null
    });
  } catch (error) {
    logger.error('Rate limit status check error:', error);
    res.status(500).json({ error: '상태 확인 중 오류가 발생했습니다.' });
  }
};

/**
 * 레이트 리미터 리셋 (관리자용)
 */
const resetRateLimit = async (req, res) => {
  try {
    const { ip, userId } = req.body;
    
    if (ip) {
      await rateLimiter.delete(ip);
    }
    
    if (userId) {
      await userRateLimiter.delete(`user_${userId}`);
    }

    logger.info('Rate limit reset:', { ip, userId });
    
    res.json({ 
      success: true, 
      message: 'Rate limit has been reset',
      reset: { ip, userId }
    });
  } catch (error) {
    logger.error('Rate limit reset error:', error);
    res.status(500).json({ error: '리셋 중 오류가 발생했습니다.' });
  }
};

module.exports = {
  rateLimiterMiddleware,
  userRateLimiterMiddleware,
  bypassRateLimit,
  getRateLimitStatus,
  resetRateLimit,
  // 기본 익스포트는 일반적인 레이트 리미터
  default: rateLimiterMiddleware
};