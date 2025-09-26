const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const aiService = require('../services/aiService');
const kakaoService = require('../services/kakaoService');
const { validateKakaoRequest } = require('../middleware/validation');

/**
 * KakaoTalk 챗봇 웹훅 엔드포인트
 * 카카오 i Open Builder에서 전송되는 요청을 처리
 */
router.post('/kakaotalk', validateKakaoRequest, async (req, res) => {
  try {
    const { userRequest, intent, action } = req.body;
    const userId = userRequest?.user?.id;
    const userMessage = userRequest?.utterance;

    logger.info('KakaoTalk webhook received:', {
      userId,
      userMessage,
      intent: intent?.name,
      action: action?.name
    });

    // 사용자 메시지가 없는 경우 기본 응답
    if (!userMessage) {
      return res.json(kakaoService.createSimpleResponse(
        '안녕하세요! 무엇을 도와드릴까요?'
      ));
    }

    // AI 서비스를 통해 응답 생성
    const aiResponse = await aiService.generateResponse(userMessage, {
      userId,
      intent: intent?.name,
      action: action?.name,
      context: userRequest?.contexts
    });

    // KakaoTalk 형식으로 응답 변환
    const kakaoResponse = kakaoService.createResponse(aiResponse);

    logger.info('Response sent to user:', {
      userId,
      responseType: kakaoResponse.template?.outputs?.[0]?.simpleText ? 'text' : 'complex',
      hasQuickReplies: !!kakaoResponse.template?.quickReplies?.length
    });

    res.json(kakaoResponse);

  } catch (error) {
    logger.error('Webhook processing error:', error);
    
    // 에러 발생 시 기본 응답 반환
    res.json(kakaoService.createSimpleResponse(
      '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    ));
  }
});

/**
 * 스킬 서버 상태 확인 엔드포인트
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'active',
    service: 'KakaoTalk Business Agent Webhook',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * 테스트용 메시지 처리 엔드포인트 (개발용)
 */
router.post('/test', async (req, res) => {
  try {
    const { message, userId = 'test-user' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: '메시지가 필요합니다.' });
    }

    const aiResponse = await aiService.generateResponse(message, {
      userId,
      intent: 'test',
      action: 'test'
    });

    const kakaoResponse = kakaoService.createResponse(aiResponse);
    
    res.json({
      input: message,
      aiResponse,
      kakaoResponse
    });

  } catch (error) {
    logger.error('Test endpoint error:', error);
    res.status(500).json({ error: '테스트 처리 중 오류가 발생했습니다.' });
  }
});

module.exports = router;