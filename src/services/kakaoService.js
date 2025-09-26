const logger = require('../utils/logger');

class KakaoService {
  /**
   * AI 응답을 KakaoTalk 형식으로 변환
   * @param {object} aiResponse - AI 서비스에서 받은 응답
   * @returns {object} KakaoTalk 스킬 응답 형식
   */
  createResponse(aiResponse) {
    try {
      const { type, content, quickReplies } = aiResponse;

      switch (type) {
        case 'text':
          return this.createTextResponse(content, quickReplies);
        case 'card':
          return this.createCardResponse(aiResponse);
        case 'carousel':
          return this.createCarouselResponse(aiResponse);
        default:
          return this.createSimpleResponse(content);
      }
    } catch (error) {
      logger.error('KakaoService response creation error:', error);
      return this.createSimpleResponse('응답 생성 중 오류가 발생했습니다.');
    }
  }

  /**
   * 간단한 텍스트 응답 생성
   * @param {string} text - 응답 텍스트
   * @returns {object} KakaoTalk 스킬 응답
   */
  createSimpleResponse(text) {
    return {
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: text
            }
          }
        ]
      }
    };
  }

  /**
   * 텍스트 응답 + 퀵 리플라이 생성
   * @param {string} text - 응답 텍스트
   * @param {Array} quickReplies - 퀵 리플라이 배열
   * @returns {object} KakaoTalk 스킬 응답
   */
  createTextResponse(text, quickReplies = []) {
    const response = {
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: text
            }
          }
        ]
      }
    };

    // 퀵 리플라이 추가
    if (quickReplies && quickReplies.length > 0) {
      response.template.quickReplies = quickReplies.map(reply => ({
        label: reply,
        action: 'message',
        messageText: reply
      }));
    }

    return response;
  }

  /**
   * 카드 응답 생성
   * @param {object} cardData - 카드 데이터
   * @returns {object} KakaoTalk 스킬 응답
   */
  createCardResponse(cardData) {
    const { title, description, imageUrl, buttons = [], quickReplies = [] } = cardData;

    const card = {
      title: title || '제목',
      description: description || '',
      buttons: buttons.map(button => ({
        label: button.label,
        action: button.action || 'webLink',
        webLinkUrl: button.url || button.webLinkUrl,
        messageText: button.messageText
      }))
    };

    if (imageUrl) {
      card.thumbnail = {
        imageUrl: imageUrl
      };
    }

    const response = {
      version: '2.0',
      template: {
        outputs: [
          {
            basicCard: card
          }
        ]
      }
    };

    // 퀵 리플라이 추가
    if (quickReplies.length > 0) {
      response.template.quickReplies = quickReplies.map(reply => ({
        label: reply,
        action: 'message',
        messageText: reply
      }));
    }

    return response;
  }

  /**
   * 캐러셀 응답 생성
   * @param {object} carouselData - 캐러셀 데이터
   * @returns {object} KakaoTalk 스킬 응답
   */
  createCarouselResponse(carouselData) {
    const { items = [], quickReplies = [] } = carouselData;

    const cards = items.map(item => ({
      title: item.title,
      description: item.description,
      thumbnail: item.imageUrl ? { imageUrl: item.imageUrl } : undefined,
      buttons: item.buttons?.map(button => ({
        label: button.label,
        action: button.action || 'webLink',
        webLinkUrl: button.url,
        messageText: button.messageText
      })) || []
    }));

    const response = {
      version: '2.0',
      template: {
        outputs: [
          {
            carousel: {
              type: 'basicCard',
              items: cards
            }
          }
        ]
      }
    };

    // 퀵 리플라이 추가
    if (quickReplies.length > 0) {
      response.template.quickReplies = quickReplies.map(reply => ({
        label: reply,
        action: 'message',
        messageText: reply
      }));
    }

    return response;
  }

  /**
   * 리스트 카드 응답 생성
   * @param {object} listData - 리스트 데이터
   * @returns {object} KakaoTalk 스킬 응답
   */
  createListResponse(listData) {
    const { header, items = [], quickReplies = [] } = listData;

    const response = {
      version: '2.0',
      template: {
        outputs: [
          {
            listCard: {
              header: {
                title: header?.title || '목록'
              },
              items: items.map(item => ({
                title: item.title,
                description: item.description,
                imageUrl: item.imageUrl,
                link: item.link ? {
                  web: item.link
                } : undefined
              }))
            }
          }
        ]
      }
    };

    // 퀵 리플라이 추가
    if (quickReplies.length > 0) {
      response.template.quickReplies = quickReplies.map(reply => ({
        label: reply,
        action: 'message',
        messageText: reply
      }));
    }

    return response;
  }

  /**
   * 컨텍스트 설정이 포함된 응답 생성
   * @param {string} text - 응답 텍스트
   * @param {object} context - 설정할 컨텍스트
   * @param {Array} quickReplies - 퀵 리플라이
   * @returns {object} KakaoTalk 스킬 응답
   */
  createContextResponse(text, context = {}, quickReplies = []) {
    const response = this.createTextResponse(text, quickReplies);

    if (Object.keys(context).length > 0) {
      response.context = context;
    }

    return response;
  }

  /**
   * 사용자 정보 요청 응답 생성
   * @param {string} text - 응답 텍스트
   * @param {Array} requiredInfo - 요청할 정보 목록
   * @returns {object} KakaoTalk 스킬 응답
   */
  createUserInfoRequestResponse(text, requiredInfo = []) {
    const response = this.createSimpleResponse(text);
    
    if (requiredInfo.length > 0) {
      response.data = {
        requiredUserInfo: requiredInfo
      };
    }

    return response;
  }

  /**
   * 에러 응답 생성
   * @param {string} errorMessage - 에러 메시지
   * @param {string} fallbackMessage - 폴백 메시지
   * @returns {object} KakaoTalk 스킬 응답
   */
  createErrorResponse(errorMessage, fallbackMessage = '죄송합니다. 다시 시도해 주세요.') {
    logger.error('Creating error response:', errorMessage);
    
    return this.createTextResponse(fallbackMessage, ['처음으로', '상담원 연결']);
  }

  /**
   * 비즈니스 로직별 응답 생성 헬퍼
   */
  
  /**
   * 주문 조회 결과 응답
   * @param {object} orderInfo - 주문 정보
   * @returns {object} KakaoTalk 스킬 응답
   */
  createOrderInfoResponse(orderInfo) {
    const { orderNumber, status, items, totalAmount, deliveryInfo } = orderInfo;
    
    const text = `📦 주문정보 안내
주문번호: ${orderNumber}
주문상태: ${status}
총 주문금액: ${totalAmount?.toLocaleString()}원
배송상태: ${deliveryInfo?.status || '준비중'}

${items?.length > 0 ? `주문상품: ${items[0]?.name}${items.length > 1 ? ` 외 ${items.length - 1}건` : ''}` : ''}`;

    return this.createTextResponse(text, ['배송 추적', '주문 변경', '처음으로']);
  }

  /**
   * 제품 정보 응답
   * @param {object} productInfo - 제품 정보
   * @returns {object} KakaoTalk 스킬 응답
   */
  createProductInfoResponse(productInfo) {
    const { name, price, description, imageUrl, inStock } = productInfo;
    
    const buttons = [
      { label: '구매하기', action: 'webLink', url: productInfo.buyUrl },
      { label: '장바구니', action: 'message', messageText: '장바구니에 담기' }
    ];

    if (!inStock) {
      buttons[0] = { label: '재입고 알림', action: 'message', messageText: '재입고 알림 설정' };
    }

    return this.createCardResponse({
      title: name,
      description: `${price?.toLocaleString()}원\n\n${description}`,
      imageUrl,
      buttons,
      quickReplies: ['다른 제품 보기', '사용법 문의', '처음으로']
    });
  }

  /**
   * FAQ 응답 생성
   * @param {object} faqData - FAQ 데이터
   * @returns {object} KakaoTalk 스킬 응답
   */
  createFAQResponse(faqData) {
    const { question, answer, relatedQuestions = [] } = faqData;
    
    const quickReplies = relatedQuestions.slice(0, 2).concat(['다른 문의하기']);
    
    return this.createTextResponse(`❓ ${question}\n\n${answer}`, quickReplies);
  }
}

module.exports = new KakaoService();