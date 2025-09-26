const OpenAI = require('openai');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // 대화 컨텍스트 저장 (실제 운영시에는 Redis나 DB 사용 권장)
    this.conversationHistory = new Map();
  }

  /**
   * 사용자 메시지에 대한 AI 응답 생성
   * @param {string} userMessage - 사용자 메시지
   * @param {object} context - 요청 컨텍스트 (사용자 ID, 인텐트 등)
   * @returns {Promise<object>} AI 응답 객체
   */
  async generateResponse(userMessage, context = {}) {
    try {
      const { userId, intent, action } = context;
      const sessionId = userId || uuidv4();

      // 대화 히스토리 가져오기 또는 초기화
      let conversation = this.getConversationHistory(sessionId);

      // 시스템 프롬프트 구성
      const systemPrompt = this.buildSystemPrompt(intent, action);

      // 메시지 배열 구성
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversation,
        { role: 'user', content: userMessage }
      ];

      logger.info('Generating AI response:', {
        sessionId,
        userMessage: userMessage.substring(0, 100) + '...',
        intent,
        action,
        conversationLength: conversation.length
      });

      // OpenAI API 호출
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages,
        max_tokens: parseInt(process.env.MAX_TOKENS) || 500,
        temperature: parseFloat(process.env.TEMPERATURE) || 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const aiResponse = completion.choices[0].message.content.trim();

      // 대화 히스토리 업데이트
      this.updateConversationHistory(sessionId, userMessage, aiResponse);

      // 응답 분석 및 구조화
      const structuredResponse = this.analyzeResponse(aiResponse, userMessage, context);

      logger.info('AI response generated successfully:', {
        sessionId,
        responseLength: aiResponse.length,
        hasQuickReplies: !!structuredResponse.quickReplies?.length,
        responseType: structuredResponse.type
      });

      return structuredResponse;

    } catch (error) {
      logger.error('AI service error:', error);
      
      // 에러 발생 시 폴백 응답
      return {
        type: 'text',
        content: '죄송합니다. 현재 시스템에 일시적인 문제가 발생했습니다. 잠시 후 다시 문의해 주세요.',
        quickReplies: ['처음으로', '상담원 연결']
      };
    }
  }

  /**
   * 시스템 프롬프트 구성
   * @param {string} intent - 인텐트 이름
   * @param {string} action - 액션 이름
   * @returns {string} 시스템 프롬프트
   */
  buildSystemPrompt(intent, action) {
    const basePrompt = `당신은 한국의 비즈니스 고객지원 전문 AI 어시스턴트입니다.

역할과 특성:
- 친근하고 전문적인 톤으로 응답합니다
- 한국어로만 응답하며, 존댓말을 사용합니다
- 고객의 문의사항을 정확히 파악하고 도움이 되는 답변을 제공합니다
- 불확실한 정보는 추측하지 않고 확인이 필요하다고 안내합니다

주요 업무 영역:
1. 일반 문의 응답
2. 제품/서비스 안내
3. 주문 및 배송 문의
4. 기술 지원
5. 계정 관리 도움

응답 지침:
- 응답은 간결하고 명확하게 작성합니다 (최대 200자 이내)
- 필요시 단계별 안내를 제공합니다
- 추가 도움이 필요한 경우 상담원 연결을 안내합니다
- 개인정보는 절대 요청하거나 저장하지 않습니다`;

    // 인텐트별 추가 컨텍스트
    const intentContext = this.getIntentContext(intent, action);
    
    return intentContext ? `${basePrompt}\n\n현재 상황: ${intentContext}` : basePrompt;
  }

  /**
   * 인텐트별 컨텍스트 반환
   * @param {string} intent - 인텐트 이름
   * @param {string} action - 액션 이름
   * @returns {string} 인텐트별 컨텍스트
   */
  getIntentContext(intent, action) {
    const contexts = {
      '주문문의': '고객이 주문 관련 문의를 하고 있습니다. 주문번호, 배송상태, 취소/교환/환불에 대해 도움을 드리세요.',
      '제품문의': '고객이 제품에 대해 문의하고 있습니다. 제품 정보, 사용법, 호환성 등에 대해 안내해 주세요.',
      '기술지원': '고객이 기술적 문제를 겪고 있습니다. 단계별 해결방법을 제공하거나 기술지원팀 연결을 안내하세요.',
      '계정문의': '고객이 계정 관련 문의를 하고 있습니다. 로그인, 비밀번호 재설정, 회원정보 등에 대해 도움을 드리세요.'
    };

    return contexts[intent] || null;
  }

  /**
   * AI 응답 분석 및 구조화
   * @param {string} aiResponse - AI 원본 응답
   * @param {string} userMessage - 사용자 메시지
   * @param {object} context - 요청 컨텍스트
   * @returns {object} 구조화된 응답 객체
   */
  analyzeResponse(aiResponse, userMessage, context) {
    // 퀵 리플라이 후보 생성
    const quickReplies = this.generateQuickReplies(aiResponse, userMessage, context);

    return {
      type: 'text',
      content: aiResponse,
      quickReplies,
      metadata: {
        sessionId: context.userId,
        intent: context.intent,
        action: context.action,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * 퀵 리플라이 생성
   * @param {string} aiResponse - AI 응답
   * @param {string} userMessage - 사용자 메시지
   * @param {object} context - 컨텍스트
   * @returns {Array} 퀵 리플라이 배열
   */
  generateQuickReplies(aiResponse, userMessage, context) {
    // 기본 퀵 리플라이
    const defaultReplies = ['도움이 더 필요해요', '처음으로'];

    // 컨텍스트 기반 퀵 리플라이
    const contextReplies = {
      '주문문의': ['주문 조회', '배송 조회', '취소/환불'],
      '제품문의': ['다른 제품 보기', '사용법 문의', '구매하기'],
      '기술지원': ['다시 설명해주세요', '상담원 연결', '다른 방법'],
      '계정문의': ['비밀번호 재설정', '로그인 도움', '회원가입']
    };

    const replies = contextReplies[context.intent] || defaultReplies;
    
    // 최대 3개까지만 반환
    return replies.slice(0, 3);
  }

  /**
   * 대화 히스토리 조회
   * @param {string} sessionId - 세션 ID
   * @returns {Array} 대화 히스토리
   */
  getConversationHistory(sessionId) {
    return this.conversationHistory.get(sessionId) || [];
  }

  /**
   * 대화 히스토리 업데이트
   * @param {string} sessionId - 세션 ID
   * @param {string} userMessage - 사용자 메시지
   * @param {string} aiResponse - AI 응답
   */
  updateConversationHistory(sessionId, userMessage, aiResponse) {
    let history = this.getConversationHistory(sessionId);
    
    // 새 메시지 추가
    history.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: aiResponse }
    );

    // 히스토리 길이 제한 (최근 10개 메시지만 유지)
    if (history.length > 20) {
      history = history.slice(-20);
    }

    this.conversationHistory.set(sessionId, history);

    // 메모리 관리를 위해 1시간 후 히스토리 자동 삭제
    setTimeout(() => {
      this.conversationHistory.delete(sessionId);
    }, 60 * 60 * 1000); // 1시간
  }

  /**
   * 대화 히스토리 초기화
   * @param {string} sessionId - 세션 ID
   */
  clearConversationHistory(sessionId) {
    this.conversationHistory.delete(sessionId);
  }
}

module.exports = new AIService();