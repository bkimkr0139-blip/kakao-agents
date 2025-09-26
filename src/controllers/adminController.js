const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const aiService = require('../services/aiService');
const { OpenAI } = require('openai');

/**
 * 관리자 대시보드 컨트롤러
 * 시스템 설정, 모니터링, 테스트 기능 제공
 */

// 환경변수 파일 경로
const ENV_FILE_PATH = path.join(process.cwd(), '.env');

/**
 * 현재 설정 조회
 */
router.get('/config', async (req, res) => {
  try {
    const config = {
      // 서버 설정
      server: {
        port: process.env.PORT || '3000',
        nodeEnv: process.env.NODE_ENV || 'development',
        allowedOrigins: process.env.ALLOWED_ORIGINS || 'https://builder.kakao.com'
      },
      // OpenAI 설정
      openai: {
        apiKey: process.env.OPENAI_API_KEY ? '***설정됨***' : '',
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        maxTokens: process.env.MAX_TOKENS || '500',
        temperature: process.env.TEMPERATURE || '0.7'
      },
      // 카카오톡 설정
      kakao: {
        botId: process.env.KAKAO_BOT_ID || '',
        botName: process.env.KAKAO_BOT_NAME || 'Business Support Agent'
      },
      // Rate Limiting 설정
      rateLimit: {
        points: process.env.RATE_LIMIT_POINTS || '100',
        duration: process.env.RATE_LIMIT_DURATION || '60',
        userPoints: process.env.USER_RATE_LIMIT_POINTS || '30',
        userDuration: process.env.USER_RATE_LIMIT_DURATION || '60'
      },
      // 로깅 설정
      logging: {
        level: process.env.LOG_LEVEL || 'info'
      },
      // 보안 설정
      security: {
        adminBypassToken: process.env.ADMIN_BYPASS_TOKEN ? '***설정됨***' : '',
        sessionSecret: process.env.SESSION_SECRET ? '***설정됨***' : ''
      }
    };

    res.json({ success: true, config });
  } catch (error) {
    logger.error('Configuration retrieval error:', error);
    res.status(500).json({ success: false, error: '설정 조회 중 오류가 발생했습니다.' });
  }
});

/**
 * 설정 업데이트
 */
router.post('/config', async (req, res) => {
  try {
    const updates = req.body;
    
    // 현재 .env 파일 읽기
    let envContent = '';
    try {
      envContent = await fs.readFile(ENV_FILE_PATH, 'utf8');
    } catch (error) {
      // .env 파일이 없으면 새로 생성
      envContent = '';
    }

    // 환경변수 업데이트
    const envLines = envContent.split('\n');
    const envMap = new Map();
    
    // 기존 환경변수 파싱
    envLines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key) {
          envMap.set(key.trim(), valueParts.join('='));
        }
      }
    });

    // 업데이트할 설정들을 환경변수 형태로 변환
    const configToEnvMap = {
      'server.port': 'PORT',
      'server.nodeEnv': 'NODE_ENV',
      'server.allowedOrigins': 'ALLOWED_ORIGINS',
      'openai.apiKey': 'OPENAI_API_KEY',
      'openai.model': 'OPENAI_MODEL',
      'openai.maxTokens': 'MAX_TOKENS',
      'openai.temperature': 'TEMPERATURE',
      'kakao.botId': 'KAKAO_BOT_ID',
      'kakao.botName': 'KAKAO_BOT_NAME',
      'rateLimit.points': 'RATE_LIMIT_POINTS',
      'rateLimit.duration': 'RATE_LIMIT_DURATION',
      'rateLimit.userPoints': 'USER_RATE_LIMIT_POINTS',
      'rateLimit.userDuration': 'USER_RATE_LIMIT_DURATION',
      'logging.level': 'LOG_LEVEL',
      'security.adminBypassToken': 'ADMIN_BYPASS_TOKEN',
      'security.sessionSecret': 'SESSION_SECRET'
    };

    // 중첩 객체에서 값 추출하여 환경변수 업데이트
    function updateNestedConfig(obj, prefix = '') {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          updateNestedConfig(value, prefix ? `${prefix}.${key}` : key);
        } else {
          const envKey = configToEnvMap[prefix ? `${prefix}.${key}` : key];
          if (envKey && value !== undefined && value !== '') {
            // '***설정됨***' 표시는 건너뛰기
            if (value !== '***설정됨***') {
              envMap.set(envKey, value);
              // 런타임에도 환경변수 업데이트
              process.env[envKey] = value;
            }
          }
        }
      }
    }

    updateNestedConfig(updates);

    // .env 파일 내용 재구성
    let newEnvContent = '';
    const processedKeys = new Set();

    // 기존 라인들을 순회하면서 업데이트된 값으로 교체
    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key] = trimmed.split('=');
        const cleanKey = key?.trim();
        if (cleanKey && envMap.has(cleanKey)) {
          newEnvContent += `${cleanKey}=${envMap.get(cleanKey)}\n`;
          processedKeys.add(cleanKey);
        } else {
          newEnvContent += line + '\n';
        }
      } else {
        newEnvContent += line + '\n';
      }
    }

    // 새로 추가된 환경변수들 추가
    for (const [key, value] of envMap.entries()) {
      if (!processedKeys.has(key)) {
        newEnvContent += `${key}=${value}\n`;
      }
    }

    // .env 파일 저장
    await fs.writeFile(ENV_FILE_PATH, newEnvContent.trim());

    logger.info('Configuration updated successfully');
    res.json({ 
      success: true, 
      message: '설정이 성공적으로 업데이트되었습니다. 서버를 재시작해야 일부 변경사항이 적용됩니다.' 
    });

  } catch (error) {
    logger.error('Configuration update error:', error);
    res.status(500).json({ success: false, error: '설정 업데이트 중 오류가 발생했습니다.' });
  }
});

/**
 * 시스템 상태 조회
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid
      },
      services: {
        openai: await checkOpenAIConnection(),
        webhook: await checkWebhookEndpoint(),
        rateLimiter: await checkRateLimiterStatus()
      },
      logs: {
        errorCount: await getLogStats('error'),
        totalRequests: await getLogStats('requests')
      }
    };

    res.json({ success: true, status });
  } catch (error) {
    logger.error('Status check error:', error);
    res.status(500).json({ success: false, error: '상태 확인 중 오류가 발생했습니다.' });
  }
});

/**
 * OpenAI API 연결 테스트
 */
router.post('/test/openai', async (req, res) => {
  try {
    const { apiKey, model, testMessage } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ success: false, error: 'API 키가 필요합니다.' });
    }

    const testOpenAI = new OpenAI({ apiKey });
    const message = testMessage || '안녕하세요. 연결 테스트입니다.';

    const startTime = Date.now();
    const completion = await testOpenAI.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: message }],
      max_tokens: 50
    });

    const responseTime = Date.now() - startTime;
    const response = completion.choices[0].message.content;

    res.json({
      success: true,
      result: {
        response,
        responseTime: `${responseTime}ms`,
        model: completion.model,
        usage: completion.usage
      }
    });

  } catch (error) {
    logger.error('OpenAI test error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'OpenAI API 테스트 중 오류가 발생했습니다.',
      details: error.status ? `HTTP ${error.status}` : null
    });
  }
});

/**
 * 웹훅 엔드포인트 테스트
 */
router.post('/test/webhook', async (req, res) => {
  try {
    const testData = {
      userRequest: {
        user: { id: 'admin-test-user' },
        utterance: req.body.message || '테스트 메시지입니다.'
      },
      intent: { name: 'test' },
      action: { name: 'test' }
    };

    // 내부 웹훅 처리 로직 테스트
    const aiResponse = await aiService.generateResponse(
      testData.userRequest.utterance,
      {
        userId: testData.userRequest.user.id,
        intent: testData.intent.name,
        action: testData.action.name
      }
    );

    res.json({
      success: true,
      result: {
        input: testData.userRequest.utterance,
        aiResponse,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Webhook test error:', error);
    res.status(500).json({
      success: false,
      error: '웹훅 테스트 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

/**
 * 로그 파일 조회
 */
router.get('/logs/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { lines = 50 } = req.query;
    
    const logFiles = {
      error: 'error.log',
      combined: 'combined.log',
      exceptions: 'exceptions.log'
    };

    const fileName = logFiles[type];
    if (!fileName) {
      return res.status(400).json({ success: false, error: '올바르지 않은 로그 타입입니다.' });
    }

    const logPath = path.join(process.cwd(), 'logs', fileName);
    
    try {
      const content = await fs.readFile(logPath, 'utf8');
      const logLines = content.split('\n').filter(line => line.trim());
      const recentLines = logLines.slice(-parseInt(lines));
      
      res.json({
        success: true,
        logs: recentLines,
        totalLines: logLines.length,
        file: fileName
      });
    } catch (fileError) {
      res.json({
        success: true,
        logs: [],
        message: '로그 파일이 없거나 비어있습니다.',
        file: fileName
      });
    }

  } catch (error) {
    logger.error('Log retrieval error:', error);
    res.status(500).json({ success: false, error: '로그 조회 중 오류가 발생했습니다.' });
  }
});

/**
 * Rate Limiter 상태 및 관리
 */
router.get('/rate-limit-status', async (req, res) => {
  try {
    // Rate limiter 상태는 기존 rateLimiter 모듈에서 가져오기
    const rateLimiter = require('../middleware/rateLimiter');
    await rateLimiter.getRateLimitStatus(req, res);
  } catch (error) {
    logger.error('Rate limit status error:', error);
    res.status(500).json({ success: false, error: 'Rate limit 상태 확인 중 오류가 발생했습니다.' });
  }
});

router.post('/rate-limit-reset', async (req, res) => {
  try {
    const rateLimiter = require('../middleware/rateLimiter');
    await rateLimiter.resetRateLimit(req, res);
  } catch (error) {
    logger.error('Rate limit reset error:', error);
    res.status(500).json({ success: false, error: 'Rate limit 리셋 중 오류가 발생했습니다.' });
  }
});

// 헬퍼 함수들
async function checkOpenAIConnection() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return { status: 'not_configured', message: 'API 키가 설정되지 않음' };
    }

    // 간단한 연결 테스트 (실제 API 호출 없이 키 형식만 확인)
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey.startsWith('sk-') && apiKey.length > 40) {
      return { status: 'configured', message: 'API 키가 올바른 형식으로 설정됨' };
    } else {
      return { status: 'invalid', message: 'API 키 형식이 올바르지 않음' };
    }
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

async function checkWebhookEndpoint() {
  try {
    return {
      status: 'running',
      endpoint: `/webhook/kakaotalk`,
      port: process.env.PORT || 3000
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

async function checkRateLimiterStatus() {
  try {
    return {
      status: 'active',
      limits: {
        general: `${process.env.RATE_LIMIT_POINTS || 100} requests per ${process.env.RATE_LIMIT_DURATION || 60} seconds`,
        user: `${process.env.USER_RATE_LIMIT_POINTS || 30} requests per ${process.env.USER_RATE_LIMIT_DURATION || 60} seconds`
      }
    };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

async function getLogStats(type) {
  try {
    if (type === 'error') {
      const errorLogPath = path.join(process.cwd(), 'logs', 'error.log');
      const content = await fs.readFile(errorLogPath, 'utf8');
      return content.split('\n').filter(line => line.trim()).length;
    } else if (type === 'requests') {
      const combinedLogPath = path.join(process.cwd(), 'logs', 'combined.log');
      const content = await fs.readFile(combinedLogPath, 'utf8');
      // HTTP 요청 라인 수를 대략적으로 계산
      return content.split('\n').filter(line => line.includes('info')).length;
    }
    return 0;
  } catch (error) {
    return 0;
  }
}

module.exports = router;