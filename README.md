# 카카오톡 챗봇 활용 업무지원 에이전트 🤖

한국의 비즈니스 환경에 특화된 카카오톡 챗봇 기반의 AI 고객지원 시스템입니다.

## 🌟 주요 기능

### 고객지원 서비스
- **실시간 문의 응답**: OpenAI GPT를 활용한 자연어 기반 고객 문의 처리
- **다양한 문의 유형 지원**: 제품 정보, 주문 관리, 기술 지원, 계정 관리
- **상황별 맞춤 응답**: 인텐트 기반의 컨텍스트 인식 및 개인화된 답변
- **퀵 리플라이**: 자주 묻는 질문에 대한 빠른 선택형 답변

### 기술적 특징
- **카카오 i Open Builder 연동**: 공식 카카오톡 챗봇 API 활용
- **OpenAI GPT 통합**: 최신 언어모델을 활용한 고품질 응답 생성
- **대화 컨텍스트 관리**: 연속된 대화 맥락 유지 및 개인화
- **실시간 로깅 및 모니터링**: Winston을 활용한 체계적 로그 관리

## 🏗️ 시스템 아키텍처

```
사용자 (카카오톡) 
    ↓
카카오 i Open Builder 
    ↓ Webhook
Express 서버 (Node.js)
    ↓
AI 서비스 (OpenAI GPT)
    ↓
응답 포맷팅 (카카오톡 형식)
    ↓
사용자에게 전달
```

### 핵심 컴포넌트
- **Webhook Controller**: 카카오톡 요청 수신 및 처리
- **AI Service**: OpenAI API 연동 및 응답 생성
- **Kakao Service**: 카카오톡 형식 응답 변환
- **Middleware**: 인증, 검증, 속도 제한, 에러 처리

## 📋 요구사항

### 시스템 요구사항
- **Node.js**: v16.0.0 이상
- **NPM**: v7.0.0 이상
- **메모리**: 최소 512MB (권장 1GB)

### API 키 필요사항
- **OpenAI API Key**: GPT 모델 사용을 위한 필수 키
- **카카오 i Open Builder**: 챗봇 등록 및 웹훅 설정

## 🚀 설치 및 설정

### 1. 프로젝트 클론 및 의존성 설치
```bash
git clone <repository-url>
cd kakaotalk-business-agent
npm install
```

### 2. 환경 변수 설정
```bash
cp .env.example .env
```

`.env` 파일을 열고 필요한 값들을 설정:
```env
# OpenAI 설정
OPENAI_API_KEY=your_openai_api_key_here

# 서버 설정  
PORT=3000
NODE_ENV=development

# 카카오톡 설정
KAKAO_BOT_ID=your_kakao_bot_id
KAKAO_BOT_NAME=Business Support Agent
```

### 3. 서버 실행
```bash
# 개발 모드 (nodemon 사용)
npm run dev

# 운영 모드
npm start
```

## 🔧 카카오 i Open Builder 설정

### 1. 카카오 i Open Builder 접속
1. [카카오 i Open Builder](https://builder.kakao.com) 접속
2. 새 챗봇 생성 또는 기존 챗봇 선택

### 2. 웹훅 설정
1. **설정 > 서버 설정** 메뉴 접근
2. **스킬 서버** 추가
   - URL: `https://your-domain.com/webhook/kakaotalk`
   - Method: POST

### 3. 인텐트 및 엔티티 설정
기본 인텐트 예시:
- `주문문의`: 주문, 배송, 취소 관련 문의
- `제품문의`: 제품 정보, 사용법 문의  
- `기술지원`: 기술적 문제 해결
- `계정문의`: 로그인, 회원가입 관련

## 📁 프로젝트 구조

```
kakaotalk-business-agent/
├── src/                    # 소스 코드
│   ├── controllers/        # 요청 처리 컨트롤러
│   │   └── webhookController.js
│   ├── services/           # 비즈니스 로직
│   │   ├── aiService.js
│   │   └── kakaoService.js
│   ├── middleware/         # 미들웨어
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   └── validation.js
│   ├── utils/              # 유틸리티
│   │   └── logger.js
│   └── app.js              # 메인 애플리케이션
├── config/                 # 설정 파일
│   └── config.js
├── docs/                   # 문서
├── tests/                  # 테스트 코드
├── logs/                   # 로그 파일
├── scripts/                # 배포/유지보수 스크립트
├── .env.example            # 환경변수 템플릿
├── .gitignore              # Git 무시 파일
├── package.json            # 프로젝트 설정
└── README.md               # 프로젝트 문서
```

## 🔌 API 엔드포인트

### Webhook 엔드포인트
- **POST** `/webhook/kakaotalk` - 카카오톡 메시지 처리
- **GET** `/webhook/status` - 웹훅 서버 상태 확인

### 개발/테스트 엔드포인트  
- **POST** `/webhook/test` - 테스트용 메시지 처리
- **GET** `/health` - 서버 헬스 체크

### 관리 엔드포인트
- **GET** `/webhook/rate-limit-status` - 속도 제한 상태 확인
- **POST** `/webhook/rate-limit-reset` - 속도 제한 초기화 (관리자)

## 🧪 테스트

### 개발 서버 테스트
```bash
curl -X POST http://localhost:3000/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"message": "안녕하세요", "userId": "test-user"}'
```

### 단위 테스트 실행
```bash
npm test
```

### 테스트 커버리지
```bash  
npm run test:coverage
```

## 📊 모니터링 및 로깅

### 로그 레벨
- **error**: 시스템 오류
- **warn**: 경고 (속도 제한, 검증 실패 등)
- **info**: 일반 정보 (요청/응답 로그)
- **debug**: 디버그 정보 (개발 환경만)

### 로그 파일
- `logs/error.log`: 에러 로그
- `logs/combined.log`: 전체 로그
- `logs/exceptions.log`: 처리되지 않은 예외
- `logs/rejections.log`: Promise rejection

## 🔒 보안 고려사항

### API 키 보안
- 환경변수를 통한 민감 정보 관리
- `.env` 파일은 Git에서 제외
- 운영 환경에서는 안전한 시크릿 관리 도구 사용

### 속도 제한 (Rate Limiting)
- IP 기반: 60초에 100회 요청 제한
- 사용자 기반: 60초에 30회 요청 제한
- 관리자 우회 토큰 지원

### 입력 검증
- 메시지 길이 제한 (1000자)
- 스팸 및 악성 콘텐츠 필터링
- Joi를 통한 구조화된 데이터 검증

## 🚀 배포 가이드

### 환경별 설정
```bash
# 개발 환경
NODE_ENV=development npm start

# 스테이징 환경  
NODE_ENV=staging npm start

# 운영 환경
NODE_ENV=production npm start
```

### PM2를 통한 프로세스 관리
```bash
# PM2 설치
npm install -g pm2

# 애플리케이션 시작
pm2 start src/app.js --name "kakaotalk-agent"

# 로그 확인
pm2 logs kakaotalk-agent

# 재시작
pm2 restart kakaotalk-agent
```

### Docker 배포 (선택사항)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 기여하기

### 개발 가이드라인
1. **코드 스타일**: ESLint 규칙 준수
2. **커밋 메시지**: [Conventional Commits](https://www.conventionalcommits.org/) 형식
3. **브랜치 전략**: GitFlow 또는 GitHub Flow
4. **테스트**: 새 기능에는 테스트 코드 작성 필수

### 이슈 및 버그 리포팅
GitHub Issues를 통해 버그 리포트나 기능 제안을 해주세요.

## 📞 지원 및 문의

### 기술 지원
- **이메일**: [기술지원 이메일]
- **문서**: [프로젝트 위키]
- **이슈 트래커**: [GitHub Issues]

### 라이선스
MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일 참조

## 📈 로드맵

### v1.1 계획
- [ ] 데이터베이스 연동 (MongoDB)
- [ ] 사용자 세션 관리
- [ ] 대화 히스토리 영구 저장

### v1.2 계획  
- [ ] 관리자 대시보드
- [ ] 실시간 분석 및 통계
- [ ] 다국어 지원 확장

### v2.0 계획
- [ ] 음성 메시지 처리
- [ ] 이미지 인식 및 처리
- [ ] 워크플로우 자동화

---

## 🎯 사용 예시

### 고객 문의 시나리오
```
고객: "주문한 상품 언제 도착하나요?"
봇: "주문 조회를 도와드리겠습니다. 주문번호를 알려주시면 배송 상태를 확인해 드릴게요."

고객: "ABC123456"  
봇: "📦 주문정보 안내
주문번호: ABC123456
주문상태: 배송중
배송업체: CJ대한통운
예상 도착일: 내일(10/27) 오후 6시"
```

### 제품 문의 시나리오  
```
고객: "이 제품 사용법 알려주세요"
봇: "어떤 제품에 대해 문의하시는지 구체적으로 알려주시면, 자세한 사용법을 안내해 드리겠습니다."

[퀴 리플라이]  
- 스마트폰 액세서리
- 가전제품  
- 기타 제품
```

이 시스템은 한국의 비즈니스 환경에 최적화되어 있으며, 카카오톡을 통한 자연스러운 고객 소통을 지원합니다. 추가 질문이나 지원이 필요하시면 언제든 문의해 주세요! 🙌