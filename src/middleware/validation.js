const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * KakaoTalk 웹훅 요청 검증 스키마
 */
const kakaoWebhookSchema = Joi.object({
  intent: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    extra: Joi.object().optional()
  }).optional(),
  
  action: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    params: Joi.object().optional(),
    detailParams: Joi.object().optional(),
    clientExtra: Joi.object().optional()
  }).optional(),
  
  userRequest: Joi.object({
    timezone: Joi.string().required(),
    params: Joi.object({
      ignoreMe: Joi.string().optional(),
      surface: Joi.string().optional()
    }).optional(),
    block: Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required()
    }).required(),
    utterance: Joi.string().allow('').required(),
    lang: Joi.string().optional(),
    user: Joi.object({
      id: Joi.string().required(),
      type: Joi.string().optional(),
      properties: Joi.object().optional()
    }).required(),
    contexts: Joi.array().items(Joi.object()).optional()
  }).required(),
  
  bot: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required()
  }).optional(),
  
  contexts: Joi.array().items(Joi.object()).optional()
});

/**
 * 테스트 요청 검증 스키마
 */
const testRequestSchema = Joi.object({
  message: Joi.string().required().min(1).max(1000),
  userId: Joi.string().optional(),
  intent: Joi.string().optional(),
  action: Joi.string().optional()
});

/**
 * KakaoTalk 웹훅 요청 검증 미들웨어
 */
const validateKakaoRequest = (req, res, next) => {
  try {
    const { error, value } = kakaoWebhookSchema.validate(req.body, {
      allowUnknown: true, // 카카오에서 새로운 필드가 추가될 수 있음
      stripUnknown: false // 알려지지 않은 필드도 보존
    });

    if (error) {
      logger.warn('KakaoTalk request validation failed:', {
        error: error.details,
        body: req.body,
        ip: req.ip
      });

      // 검증 실패시에도 200으로 응답 (카카오 재시도 방지)
      return res.status(200).json({
        version: '2.0',
        template: {
          outputs: [
            {
              simpleText: {
                text: '요청 형식이 올바르지 않습니다. 다시 시도해 주세요.'
              }
            }
          ]
        }
      });
    }

    // 검증된 데이터를 req.body에 다시 할당
    req.body = value;
    
    // 로깅용 정보 추출
    req.kakaoInfo = {
      userId: value.userRequest?.user?.id,
      utterance: value.userRequest?.utterance,
      intent: value.intent?.name,
      action: value.action?.name,
      blockName: value.userRequest?.block?.name
    };

    next();
  } catch (error) {
    logger.error('Validation middleware error:', error);
    
    res.status(200).json({
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: '요청 처리 중 오류가 발생했습니다.'
            }
          }
        ]
      }
    });
  }
};

/**
 * 테스트 요청 검증 미들웨어
 */
const validateTestRequest = (req, res, next) => {
  try {
    const { error, value } = testRequestSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          message: '요청 데이터가 올바르지 않습니다.',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }))
        }
      });
    }

    req.body = value;
    next();
  } catch (error) {
    logger.error('Test request validation error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '검증 중 오류가 발생했습니다.'
      }
    });
  }
};

/**
 * 일반적인 객체 검증 헬퍼
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            message: '입력 데이터가 올바르지 않습니다.',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message,
              value: detail.context?.value
            }))
          }
        });
      }

      req.body = value;
      next();
    } catch (error) {
      logger.error('General validation error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: '검증 중 오류가 발생했습니다.'
        }
      });
    }
  };
};

/**
 * 쿼리 파라미터 검증
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.query);

      if (error) {
        return res.status(400).json({
          success: false,
          error: {
            message: '쿼리 파라미터가 올바르지 않습니다.',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message,
              value: detail.context?.value
            }))
          }
        });
      }

      req.query = value;
      next();
    } catch (error) {
      logger.error('Query validation error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: '쿼리 검증 중 오류가 발생했습니다.'
        }
      });
    }
  };
};

/**
 * 사용자 ID 검증
 */
const validateUserId = (req, res, next) => {
  const userId = req.body?.userRequest?.user?.id || req.params.userId || req.query.userId;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: {
        message: '사용자 ID가 필요합니다.'
      }
    });
  }

  // 사용자 ID 형식 검증 (카카오 사용자 ID는 일반적으로 숫자로 구성)
  if (!/^[a-zA-Z0-9\-_]{10,50}$/.test(userId)) {
    logger.warn('Invalid user ID format:', {
      userId,
      ip: req.ip,
      url: req.url
    });

    return res.status(400).json({
      success: false,
      error: {
        message: '올바르지 않은 사용자 ID 형식입니다.'
      }
    });
  }

  req.userId = userId;
  next();
};

/**
 * 메시지 내용 검증 및 필터링
 */
const validateMessage = (req, res, next) => {
  const message = req.body?.userRequest?.utterance || req.body?.message;
  
  if (!message) {
    return next(); // 메시지가 없어도 기본 응답 가능
  }

  // 메시지 길이 검증
  if (message.length > 1000) {
    return res.status(200).json({
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: '메시지가 너무 깁니다. 1000자 이내로 입력해 주세요.'
            }
          }
        ]
      }
    });
  }

  // 스팸 또는 악성 콘텐츠 기본 필터링
  const spamPatterns = [
    /https?:\/\/[^\s]+/gi, // URL 패턴
    /\b\d{3}-\d{3,4}-\d{4}\b/g, // 전화번호 패턴
    /[가-힣]{1}[가-힣\s]*[광고|홍보|마케팅|스팸]/gi // 한국어 광고 관련 키워드
  ];

  let isSpam = false;
  for (const pattern of spamPatterns) {
    if (pattern.test(message)) {
      isSpam = true;
      break;
    }
  }

  if (isSpam) {
    logger.warn('Potential spam message detected:', {
      message: message.substring(0, 100) + '...',
      userId: req.body?.userRequest?.user?.id,
      ip: req.ip
    });

    return res.status(200).json({
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: '적절하지 않은 내용이 포함되어 있습니다. 다른 방식으로 문의해 주세요.'
            }
          }
        ]
      }
    });
  }

  req.validatedMessage = message.trim();
  next();
};

module.exports = {
  validateKakaoRequest,
  validateTestRequest,
  validate,
  validateQuery,
  validateUserId,
  validateMessage,
  // 스키마들도 외부에서 사용할 수 있도록 노출
  schemas: {
    kakaoWebhookSchema,
    testRequestSchema
  }
};