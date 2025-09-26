# KakaoTalk Business Agent - Messenger Bot R Integration

카카오톡 메시지를 Android "메신저 봇 R" 앱을 통해 자동으로 3줄 요약해주는 AI 기반 서비스입니다.

## 🔄 New Architecture (v2.0)

```
Android 카카오톡 → 메신저 봇 R 앱 → Node.js Server → OpenAI GPT → 3줄 요약 응답
```

### 기존 vs 새로운 구조
- **기존 (v1.0)**: KakaoTalk ↔ Kakao i OpenBuilder ↔ Node.js
- **새로운 (v2.0)**: KakaoTalk ↔ 메신저 봇 R 앱 ↔ Node.js ↔ OpenAI

## 🆕 주요 업데이트

- ✅ **메신저 봇 R 연동**: Android 앱을 통한 카카오톡 메시지 자동 처리
- ✅ **3줄 요약 기능**: OpenAI GPT-4o-mini를 사용한 메시지 요약
- ✅ **새로운 관리자 대시보드**: 메신저 봇 R 설정 및 관리
- ✅ **실시간 테스트**: 메시지 처리 및 AI 연결 테스트 기능
- ✅ **FastAPI 버전**: 추가적인 FastAPI 구현체 포함

## 🚀 빠른 시작

### 1. 서버 실행 (Node.js)

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일에서 OPENAI_API_KEY 설정

# 서버 시작
npm start
```

### 2. FastAPI 버전 실행 (선택사항)

```bash
# Python 패키지 설치
pip install -r requirements.txt

# FastAPI 서버 시작
python start_server.py
```

### 3. 메신저 봇 R 앱 설정

> 📝 **자세한 설정 가이드**: [MESSENGER_BOT_R_SETUP.md](MESSENGER_BOT_R_SETUP.md) 참조

**간단 설정 순서:**
1. **앱 설치**: Google Play Store에서 "메신저 봇 R" (개발자: XenomDev) 설치
2. **권한 허용**: 알림 액세스 권한 필수 허용
3. **서버 IP 확인**: `ipconfig` 명령어로 IPv4 주소 확인
4. **웹훅 URL 설정**: `http://YOUR_IP:3000/webhook/messenger-bot-r/message`
5. **JSON 페이로드 설정**: 아래 JSON 형식 입력
6. **연결 테스트**: 관리자 대시보드에서 테스트

## 📡 API 엔드포인트

### 메신저 봇 R 웹훅
- `POST /webhook/messenger-bot-r/message` - 메시지 처리
- `GET /webhook/messenger-bot-r/status` - 상태 확인
- `POST /webhook/messenger-bot-r/test` - 테스트
- `GET /webhook/messenger-bot-r/config` - 설정 정보

### 관리자 API
- `GET /admin` - 관리자 대시보드
- `GET /admin/config` - 설정 조회
- `POST /admin/config` - 설정 업데이트
- `GET /admin/status` - 시스템 상태

## 🔧 설정 가이드

### 환경변수 (.env)

```env
# 서버 설정
NODE_ENV=development
PORT=3000

# OpenAI 설정
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
MAX_TOKENS=500
TEMPERATURE=0.7

# 관리자 설정
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123!
DISABLE_ADMIN_AUTH=true
```

### 메신저 봇 R JSON 형식

```json
{
  "room": "{room}",
  "sender": "{sender}",
  "message": "{message}",
  "isGroupChat": {isGroupChat},
  "timestamp": {timestamp},
  "packageName": "com.kakao.talk"
}
```

## 📱 사용 방법

1. **서버 실행**: `npm start` 또는 `python start_server.py`
2. **관리자 접속**: `http://localhost:3000/admin`
3. **메신저 봇 R 설정**: 앱에서 웹훅 URL 설정
4. **테스트**: 관리자 대시보드에서 메시지 처리 테스트
5. **사용**: 카카오톡 메시지가 자동으로 3줄 요약되어 응답

## 🧪 테스트

### curl을 사용한 테스트

```bash
# 웹훅 테스트
curl -X POST http://localhost:3000/webhook/messenger-bot-r/test \
  -H "Content-Type: application/json" \
  -d '{"message": "안녕하세요! 오늘 날씨가 좋네요."}'

# 메시지 처리 테스트
curl -X POST http://localhost:3000/webhook/messenger-bot-r/message \
  -H "Content-Type: application/json" \
  -d '{
    "room": "테스트방",
    "sender": "테스터", 
    "message": "안녕하세요! 오늘은 좋은 날씨네요.",
    "isGroupChat": false,
    "timestamp": 1640995200,
    "packageName": "com.kakao.talk"
  }'
```

## 🏗️ 프로젝트 구조

```
kakaotalk-business-agent/
├── src/
│   ├── app.js                          # 메인 서버
│   ├── controllers/
│   │   ├── webhookController.js        # 기존 웹훅
│   │   ├── messengerBotController.js   # 메신저 봇 R 웹훅
│   │   └── adminController.js          # 관리자 API
│   ├── middleware/
│   │   ├── adminAuth.js               # 관리자 인증
│   │   └── rateLimiter.js             # 레이트 리미팅
│   └── services/
│       └── aiService.js               # AI 서비스
├── app/                               # FastAPI 버전
│   ├── main.py
│   ├── api/
│   ├── core/
│   ├── models/
│   └── services/
├── public/                            # 관리자 대시보드
│   ├── admin.html
│   ├── admin.css
│   └── admin.js
├── .env                              # 환경변수
├── package.json                      # Node.js 의존성
├── requirements.txt                  # Python 의존성
└── README.md
```

## 📊 특징

### AI 기능
- **3줄 요약**: GPT-4o-mini 모델 사용
- **한국어 최적화**: 자연스러운 한국어 요약
- **빠른 처리**: 평균 4초 내외 응답시간

### 관리 기능
- **실시간 모니터링**: 시스템 상태 및 통계
- **설정 관리**: OpenAI API 키, 모델 설정
- **로그 관리**: 실시간 로그 조회 및 관리
- **테스트 도구**: 메시지 처리 및 AI 연결 테스트

### 보안
- **관리자 인증**: HTTP Basic Auth
- **환경변수 관리**: API 키 안전 보관
- **CORS 설정**: 허용된 Origin만 접근 가능

## 🔍 트러블슈팅

### 자주 묻는 질문

**Q: 메신저 봇 R에서 연결이 안 되요**
A: 웹훅 URL에서 localhost 대신 실제 IP 주소를 사용하세요.

**Q: OpenAI API 오류가 발생해요**
A: `.env` 파일의 `OPENAI_API_KEY`를 확인하고 관리자 대시보드에서 연결 테스트를 해보세요.

**Q: 서버가 시작되지 않아요**
A: `npm install`로 의존성을 먼저 설치하고, 포트 3000이 사용 중인지 확인하세요.

## 📝 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 지원

이슈나 질문이 있으시면 GitHub Issues를 통해 문의해주세요.