# 카카오톡 메신저 봇 R 연동 FastAPI 서버

## 개요

이 프로젝트는 Android의 "메신저 봇 R" 앱을 통해 카카오톡 메시지를 받아 OpenAI LLM으로 처리하는 FastAPI 기반 서버입니다.

## 아키텍처

```
Android 카카오톡 → 메신저 봇 R 앱 → FastAPI 서버 → OpenAI API → 응답 반환
```

### 데이터 플로우

1. **카카오톡 메시지 수신**: 사용자가 카카오톡에서 메시지 전송
2. **메신저 봇 R 감지**: 앱이 알림을 감지하고 메시지 추출
3. **웹훅 전송**: 앱이 JSON 형태로 FastAPI 서버에 POST 요청
4. **LLM 처리**: OpenAI API로 메시지 요약/처리
5. **응답 반환**: JSON 응답을 앱으로 전송
6. **카카오톡 답장**: 앱이 카카오톡으로 응답 메시지 전송

## 프로젝트 구조

```
kakaotalk-business-agent/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 애플리케이션 메인
│   ├── api/
│   │   ├── __init__.py
│   │   ├── webhook.py       # 웹훅 엔드포인트
│   │   └── admin.py         # 관리자 API
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py        # 설정 관리
│   │   └── logging.py       # 로깅 설정
│   ├── models/
│   │   ├── __init__.py
│   │   └── message.py       # 데이터 모델
│   ├── services/
│   │   ├── __init__.py
│   │   └── openai_service.py # OpenAI 연동
│   └── static/              # 정적 파일
├── logs/                    # 로그 파일
├── public/                  # 웹 대시보드 (기존)
├── .env                     # 환경 변수
├── requirements.txt         # Python 의존성
├── start_server.py         # 서버 시작 스크립트
└── start_fastapi.bat       # Windows 시작 배치파일
```

## 설치 및 실행

### 1. Python 설치 확인

```bash
python --version  # Python 3.8 이상 필요
```

### 2. 의존성 설치

```bash
pip install -r requirements.txt
```

### 3. 환경변수 설정

`.env` 파일에서 설정:

```env
# FastAPI Server Configuration
HOST=127.0.0.1
PORT=8000
DEBUG=true

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7

# Admin Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password123
```

### 4. 서버 실행

#### 방법 1: Python 스크립트
```bash
python start_server.py
```

#### 방법 2: Windows 배치파일
```bash
start_fastapi.bat
```

#### 방법 3: uvicorn 직접 실행
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## API 엔드포인트

### 웹훅 엔드포인트

#### POST `/webhook/message`
메신저 봇 R에서 전송받은 메시지 처리

**요청 본문:**
```json
{
  "room": "친구와의 채팅",
  "sender": "홍길동", 
  "message": "안녕하세요! 오늘 날씨가 좋네요.",
  "isGroupChat": false,
  "timestamp": 1640995200,
  "packageName": "com.kakao.talk"
}
```

**응답:**
```json
{
  "room": "친구와의 채팅",
  "message": "📝 메시지 요약:\n안녕하세요! 좋은 하루 되세요.",
  "success": true,
  "processing_time": 1.23,
  "model_used": "gpt-4o-mini"
}
```

#### GET `/webhook/status`
웹훅 상태 확인

#### POST `/webhook/test`
웹훅 테스트

#### GET `/webhook/config`
메신저 봇 R 설정 정보 제공

### 관리자 엔드포인트 (HTTP Basic Auth 필요)

#### GET `/admin/config`
현재 설정 조회

#### POST `/admin/config/openai`
OpenAI 설정 업데이트

#### GET `/admin/stats`
서버 통계 조회

#### GET `/admin/logs`
로그 조회

#### POST `/admin/test/openai`
OpenAI 연결 테스트

### 기타 엔드포인트

#### GET `/health`
서버 상태 체크

#### GET `/docs`
Swagger API 문서 (개발 모드에서만)

#### GET `/admin/dashboard`
관리자 대시보드 웹 페이지

## 메신저 봇 R 설정

### 1. 앱 설치
- Google Play Store에서 "메신저 봇 R" 검색 후 설치

### 2. 권한 설정
- 알림 액세스 권한 허용
- 카카오톡 알림 감지 활성화

### 3. 웹훅 URL 설정
```
http://YOUR_SERVER_IP:8000/webhook/message
```

### 4. JSON 페이로드 설정
앱에서 다음 형식으로 POST 요청을 보내도록 설정:

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

## 개발 및 테스트

### 로컬 테스트

1. 서버 시작 후 `http://localhost:8000/docs`에서 API 문서 확인
2. `/webhook/test` 엔드포인트로 메시지 처리 테스트
3. 관리자 대시보드에서 OpenAI 연결 테스트

### 로그 확인

```bash
# 로그 파일 위치
tail -f logs/app.log

# 또는 관리자 API로 조회
curl -u admin:password123 http://localhost:8000/admin/logs
```

### 설정 변경

```bash
# OpenAI 설정 업데이트 (관리자 인증 필요)
curl -X POST -u admin:password123 \
  -H "Content-Type: application/json" \
  -d '{"api_key": "new-key", "model": "gpt-4"}' \
  http://localhost:8000/admin/config/openai
```

## 트러블슈팅

### 1. Python/pip 명령어 인식 안됨
- Python이 시스템 PATH에 추가되어 있는지 확인
- `python -m pip` 대신 `pip` 사용

### 2. OpenAI API 오류
- `.env` 파일의 `OPENAI_API_KEY` 확인
- 관리자 대시보드에서 연결 테스트

### 3. 포트 충돌
- `.env` 파일에서 `PORT` 변경 (기본: 8000)
- 기존 Node.js 서버와 다른 포트 사용

### 4. 메신저 봇 R 연결 실패
- 방화벽 설정 확인
- 로컬 IP 대신 외부 접근 가능한 IP 사용
- ngrok 등을 이용한 터널링 고려

## 성능 최적화

### 1. 동시 처리
- FastAPI의 비동기 처리로 다중 요청 동시 처리 가능
- OpenAI API 응답 시간에 따라 처리량 결정

### 2. 캐싱
- 자주 요청되는 메시지에 대한 응답 캐싱 고려
- Redis 등을 이용한 분산 캐싱 가능

### 3. 로드 밸런싱
- 여러 서버 인스턴스 실행으로 부하 분산 가능
- nginx 등을 이용한 리버스 프록시 설정

## 보안 고려사항

### 1. API 키 관리
- 환경변수로 OpenAI API 키 관리
- 프로덕션 환경에서는 시크릿 관리 도구 사용

### 2. 인증
- 관리자 API는 HTTP Basic Auth 사용
- 프로덕션에서는 JWT 토큰 인증 고려

### 3. CORS 설정
- 필요한 도메인만 허용하도록 CORS 설정
- 와일드카드(*) 사용 지양

### 4. HTTPS
- 프로덕션 환경에서는 HTTPS 필수
- Let's Encrypt 등을 이용한 SSL 인증서 사용

이제 FastAPI 기반의 메신저 봇 R 연동 서버가 완성되었습니다! 🎉