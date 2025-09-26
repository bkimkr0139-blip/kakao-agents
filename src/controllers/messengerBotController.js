const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const aiService = require('../services/aiService');

/**
 * 메신저 봇 R 컨트롤러
 * Android "메신저 봇 R" 앱과의 통신을 위한 웹훅 처리
 */

/**
 * 메신저 봇 R에서 전송받은 메시지 처리
 * POST /webhook/messenger-bot-r
 */
router.post('/message', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { room, sender, message, isGroupChat, timestamp, packageName } = req.body;
    
    // 필수 필드 검증
    if (!room || !sender || !message) {
      logger.warn('Invalid messenger bot request: missing required fields', { body: req.body });
      return res.status(400).json({
        success: false,
        error: 'room, sender, message fields are required'
      });
    }
    
    // 카카오톡 패키지인지 확인 (선택사항)
    if (packageName && packageName !== 'com.kakao.talk') {
      logger.info('Non-KakaoTalk message received', { packageName, room, sender });
    }
    
    logger.info(`📱 메신저 봇 R 메시지 수신`, {
      room,
      sender,
      messageLength: message.length,
      isGroupChat: isGroupChat || false,
      timestamp
    });
    
    // AI 서비스로 메시지 처리 (3줄 요약)
    const aiResponse = await generateMessageSummary(message);
    
    // 처리 시간 계산
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // 응답 생성
    const response = {
      room,
      message: aiResponse,
      success: true,
      processing_time: parseFloat(processingTime),
      model_used: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    };
    
    logger.info(`✅ 메신저 봇 R 응답 전송`, {
      room,
      responseLength: aiResponse.length,
      processingTime: `${processingTime}s`
    });
    
    res.json(response);
    
  } catch (error) {
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    logger.error('메신저 봇 R 처리 실패:', error);
    
    // 에러 응답
    res.status(500).json({
      room: req.body.room || 'unknown',
      message: '죄송합니다. 메시지 처리 중 오류가 발생했습니다.',
      success: false,
      processing_time: parseFloat(processingTime),
      model_used: null
    });
  }
});

/**
 * 웹훅 상태 확인
 * GET /webhook/messenger-bot-r/status
 */
router.get('/status', (req, res) => {
  res.json({
    status: 'active',
    service: '카카오톡 메신저 봇 R 웹훅',
    openai_available: !!process.env.OPENAI_API_KEY,
    endpoint: '/webhook/messenger-bot-r/message',
    timestamp: new Date().toISOString()
  });
});

/**
 * 웹훅 테스트 엔드포인트
 * POST /webhook/messenger-bot-r/test
 */
router.post('/test', async (req, res) => {
  try {
    const testMessage = req.body.message || '안녕하세요! 테스트 메시지입니다.';
    
    logger.info('🧪 메신저 봇 R 웹훅 테스트 실행', { testMessage });
    
    // 테스트용 가짜 요청 생성
    const testRequest = {
      room: '테스트 채팅방',
      sender: '테스트 사용자',
      message: testMessage,
      isGroupChat: false,
      timestamp: Math.floor(Date.now() / 1000),
      packageName: 'com.kakao.talk'
    };
    
    // 메시지 처리
    const aiResponse = await generateMessageSummary(testMessage);
    
    const testResponse = {
      room: testRequest.room,
      message: aiResponse,
      success: true,
      processing_time: 1.0,
      model_used: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    };
    
    res.json({
      status: 'success',
      message: '웹훅 테스트 완료',
      data: {
        test_input: testRequest,
        test_output: testResponse
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('웹훅 테스트 실패:', error);
    res.status(500).json({
      status: 'error',
      message: '웹훅 테스트 중 오류 발생',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 메신저 봇 R 설정 정보 제공
 * GET /webhook/messenger-bot-r/config
 */
router.get('/config', (req, res) => {
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || 'localhost';
  
  res.json({
    webhook_url: `http://${host}:${port}/webhook/messenger-bot-r/message`,
    test_url: `http://${host}:${port}/webhook/messenger-bot-r/test`,
    status_url: `http://${host}:${port}/webhook/messenger-bot-r/status`,
    supported_methods: ['POST'],
    content_type: 'application/json',
    example_payload: {
      room: '친구와의 채팅',
      sender: '홍길동',
      message: '안녕하세요! 오늘 날씨가 좋네요.',
      isGroupChat: false,
      timestamp: Math.floor(Date.now() / 1000),
      packageName: 'com.kakao.talk'
    },
    response_format: {
      room: '친구와의 채팅',
      message: '📝 메시지 요약:\n[3줄 요약 내용]',
      success: true,
      processing_time: 1.23,
      model_used: 'gpt-4o-mini'
    }
  });
});

/**
 * 메시지 3줄 요약 생성
 */
async function generateMessageSummary(message) {
  try {
    // OpenAI API가 설정되어 있는지 확인
    if (!process.env.OPENAI_API_KEY) {
      return `안녕하세요! 현재 AI 서비스가 설정되지 않아 요약 기능을 사용할 수 없습니다.\n\n원본 메시지: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`;
    }
    
    // AI 서비스를 사용한 3줄 요약
    const prompt = `다음 메시지를 정확히 3줄로 간결하게 요약해주세요. 핵심 내용만 포함하고 자연스러운 한국어로 작성해주세요:\n\n${message}`;
    
    const aiResponse = await aiService.generateResponse(prompt, {
      userId: 'messenger-bot-r',
      intent: 'summarize',
      action: 'summarize_3_lines'
    });
    
    // 응답에 이모지와 라벨 추가
    return `📝 메시지 요약:\n${aiResponse}`;
    
  } catch (error) {
    logger.error('메시지 요약 생성 실패:', error);
    
    // 기본 응답 (AI 서비스 실패시)
    const shortMessage = message.length > 200 ? message.substring(0, 200) + '...' : message;
    return `메시지를 받았습니다:\n${shortMessage}\n\n(AI 요약 서비스가 일시적으로 사용할 수 없습니다)`;
  }
}

module.exports = router;