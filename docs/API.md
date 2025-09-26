# API 문서

## 개요
카카오톡 챗봇 업무지원 에이전트의 API 문서입니다. 이 API는 카카오 i Open Builder와의 웹훅 통신 및 개발/테스트 목적의 엔드포인트를 제공합니다.

## Base URL
```
Development: http://localhost:3000
Production: https://your-domain.com
```

## 인증
현재 버전에서는 기본적인 웹훅 검증을 사용하며, 관리자 기능의 경우 `X-Bypass-Rate-Limit` 헤더를 통한 토큰 인증을 지원합니다.

---

## 엔드포인트

### 1. 카카오톡 웹훅 엔드포인트

#### POST /webhook/kakaotalk
카카오 i Open Builder에서 전송되는 웹훅 요청을 처리합니다.

**Headers**
```
Content-Type: application/json
```

**Request Body**
```json
{
  "intent": {
    "id": "intent-id",
    "name": "주문문의"
  },
  "action": {
    "id": "action-id",
    "name": "order-inquiry",
    "params": {},
    "detailParams": {}
  },
  "userRequest": {
    "timezone": "Asia/Seoul",
    "params": {
      "surface": "BuilderBotTest"
    },
    "block": {
      "id": "block-id",
      "name": "블록이름"
    },
    "utterance": "주문 상태 확인하고 싶어요",
    "lang": "kr",
    "user": {
      "id": "user-unique-id",
      "type": "botUserKey",
      "properties": {}
    }
  },
  "contexts": []
}
```

**Response**
```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "주문 상태를 확인해 드리겠습니다. 주문번호를 알려주시겠어요?"
        }
      }
    ],
    "quickReplies": [
      {
        "label": "주문번호 입력",
        "action": "message",
        "messageText": "주문번호 입력"
      },
      {
        "label": "최근 주문 확인",
        "action": "message",
        "messageText": "최근 주문 확인"
      }
    ]
  }
}
```

**Error Response (200 OK with error content)**
```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        }
      }
    ]
  }
}
```

---

### 2. 웹훅 상태 확인

#### GET /webhook/status
웹훅 서버의 상태를 확인합니다.

**Response**
```json
{
  "status": "active",
  "service": "KakaoTalk Business Agent Webhook",
  "timestamp": "2023-10-26T12:30:00.000Z",
  "version": "1.0.0"
}
```

---

### 3. 테스트 엔드포인트

#### POST /webhook/test
개발 및 테스트 목적으로 AI 응답을 테스트할 수 있습니다.

**Request Body**
```json
{
  "message": "안녕하세요",
  "userId": "test-user-123",
  "intent": "인사",
  "action": "greeting"
}
```

**Response**
```json
{
  "input": "안녕하세요",
  "aiResponse": {
    "type": "text",
    "content": "안녕하세요! 무엇을 도와드릴까요?",
    "quickReplies": ["도움이 더 필요해요", "처음으로"],
    "metadata": {
      "sessionId": "test-user-123",
      "intent": "인사",
      "action": "greeting",
      "timestamp": "2023-10-26T12:30:00.000Z"
    }
  },
  "kakaoResponse": {
    "version": "2.0",
    "template": {
      "outputs": [
        {
          "simpleText": {
            "text": "안녕하세요! 무엇을 도와드릴까요?"
          }
        }
      ],
      "quickReplies": [
        {
          "label": "도움이 더 필요해요",
          "action": "message",
          "messageText": "도움이 더 필요해요"
        }
      ]
    }
  }
}
```

**Error Response**
```json
{
  "success": false,
  "error": {
    "message": "요청 데이터가 올바르지 않습니다.",
    "details": [
      {
        "field": "message",
        "message": "\"message\" is required",
        "value": undefined
      }
    ]
  }
}
```

---

### 4. 헬스 체크

#### GET /health
서버의 전반적인 상태를 확인합니다.

**Response**
```json
{
  "status": "OK",
  "timestamp": "2023-10-26T12:30:00.000Z",
  "uptime": 3600.5,
  "service": "KakaoTalk Business Agent"
}
```

---

### 5. 속도 제한 관리 (관리자)

#### GET /webhook/rate-limit-status
현재 속도 제한 상태를 확인합니다.

**Query Parameters**
- `userId` (optional): 특정 사용자의 상태 확인

**Response**
```json
{
  "ip": {
    "key": "192.168.1.1",
    "remainingPoints": 85,
    "totalHits": 15,
    "resetTime": "2023-10-26T12:31:00.000Z"
  },
  "user": {
    "key": "user-123",
    "remainingPoints": 25,
    "totalHits": 5,
    "resetTime": "2023-10-26T12:31:00.000Z"
  }
}
```

#### POST /webhook/rate-limit-reset
속도 제한을 초기화합니다. (관리자 토큰 필요)

**Headers**
```
X-Bypass-Rate-Limit: your-admin-token
Content-Type: application/json
```

**Request Body**
```json
{
  "ip": "192.168.1.1",
  "userId": "user-123"
}
```

**Response**
```json
{
  "success": true,
  "message": "Rate limit has been reset",
  "reset": {
    "ip": "192.168.1.1",
    "userId": "user-123"
  }
}
```

---

## 응답 형식

### KakaoTalk 스킬 응답 형식
카카오톡 웹훅 엔드포인트는 다음과 같은 구조의 응답을 반환합니다:

#### 기본 텍스트 응답
```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "응답 메시지"
        }
      }
    ]
  }
}
```

#### 퀵 리플라이가 포함된 응답
```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "응답 메시지"
        }
      }
    ],
    "quickReplies": [
      {
        "label": "선택지 1",
        "action": "message",
        "messageText": "선택지 1"
      },
      {
        "label": "선택지 2",
        "action": "message", 
        "messageText": "선택지 2"
      }
    ]
  }
}
```

#### 카드 응답
```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "basicCard": {
          "title": "카드 제목",
          "description": "카드 설명",
          "thumbnail": {
            "imageUrl": "https://example.com/image.jpg"
          },
          "buttons": [
            {
              "label": "버튼 1",
              "action": "webLink",
              "webLinkUrl": "https://example.com"
            },
            {
              "label": "버튼 2", 
              "action": "message",
              "messageText": "버튼 2 클릭"
            }
          ]
        }
      }
    ]
  }
}
```

---

## 에러 코드

### HTTP 상태 코드
- `200 OK`: 성공 (KakaoTalk 웹훅은 에러 상황에서도 200 반환)
- `400 Bad Request`: 잘못된 요청 데이터
- `401 Unauthorized`: 인증 실패
- `429 Too Many Requests`: 속도 제한 초과
- `500 Internal Server Error`: 서버 내부 오류

### 애플리케이션 에러 코드
```json
{
  "success": false,
  "error": {
    "message": "에러 메시지",
    "status": 400,
    "timestamp": "2023-10-26T12:30:00.000Z"
  }
}
```

---

## 속도 제한

### IP 기반 제한
- **제한**: 60초에 100회 요청
- **차단 시간**: 60초
- **적용 대상**: 모든 웹훅 엔드포인트

### 사용자 기반 제한
- **제한**: 60초에 30회 요청
- **차단 시간**: 30초
- **적용 대상**: 카카오톡 웹훅 요청 (사용자 ID 기반)

### 관리자 우회
`X-Bypass-Rate-Limit` 헤더에 유효한 토큰을 포함하면 속도 제한을 우회할 수 있습니다.

---

## 개발 가이드

### 웹훅 테스트
로컬 개발 환경에서 카카오톡 웹훅을 테스트하려면 ngrok 등을 사용해 로컬 서버를 외부에 노출시킬 수 있습니다:

```bash
# ngrok 설치 후
ngrok http 3000

# 생성된 HTTPS URL을 카카오 빌더에 설정
# 예: https://abc123.ngrok.io/webhook/kakaotalk
```

### 로그 모니터링
개발 중에는 다음과 같이 실시간 로그를 모니터링할 수 있습니다:

```bash
# 전체 로그
tail -f logs/combined.log

# 에러 로그만
tail -f logs/error.log

# 특정 사용자 필터링
grep "user-123" logs/combined.log
```

### 환경 변수
개발 환경에서 필요한 주요 환경 변수:

```env
OPENAI_API_KEY=sk-...
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
```

---

## 추가 정보

### 지원되는 카카오톡 기능
- 텍스트 메시지
- 퀵 리플라이 (최대 3개)
- 기본 카드
- 캐러셀 카드
- 리스트 카드

### 제한 사항
- 메시지 길이: 최대 1000자
- 퀵 리플라이: 최대 3개
- 카드 버튼: 최대 3개
- 캐러셀 카드: 최대 10개

### 성능 최적화
- AI 응답 생성 시간: 평균 2-5초
- 대화 히스토리: 세션당 최대 20개 메시지
- 메모리 캐시: 1시간 후 자동 정리