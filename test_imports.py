"""
FastAPI 설정 및 모듈 임포트 테스트
"""

import sys
from pathlib import Path

# 프로젝트 루트를 파이썬 경로에 추가
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_basic_imports():
    """기본 모듈 임포트 테스트"""
    try:
        print("🧪 기본 모듈 임포트 테스트 시작...")
        
        # FastAPI 관련
        import fastapi
        print(f"✅ FastAPI: {fastapi.__version__}")
        
        import uvicorn
        print(f"✅ Uvicorn: {uvicorn.__version__}")
        
        # Pydantic 관련
        import pydantic
        print(f"✅ Pydantic: {pydantic.__version__}")
        
        from pydantic_settings import BaseSettings
        print("✅ Pydantic Settings")
        
        # OpenAI
        import openai
        print(f"✅ OpenAI: {openai.__version__}")
        
        # 로깅
        from loguru import logger
        print("✅ Loguru")
        
        # 기타
        import psutil
        print(f"✅ psutil: {psutil.__version__}")
        
        print("\n🎉 모든 기본 모듈 임포트 성공!")
        return True
        
    except ImportError as e:
        print(f"❌ 임포트 오류: {e}")
        return False

def test_app_imports():
    """앱 모듈 임포트 테스트"""
    try:
        print("\n🧪 앱 모듈 임포트 테스트 시작...")
        
        # 설정 모듈
        from app.core.config import settings
        print(f"✅ 설정 모듈 - 호스트: {settings.HOST}:{settings.PORT}")
        
        # 로깅 모듈
        from app.core.logging import setup_logging
        print("✅ 로깅 모듈")
        
        # 모델 모듈
        from app.models.message import IncomingMessage, ProcessedMessage
        print("✅ 메시지 모델")
        
        # 서비스 모듈
        from app.services.openai_service import openai_service
        print(f"✅ OpenAI 서비스 - 사용 가능: {openai_service.is_available()}")
        
        # API 모듈
        from app.api.webhook import router as webhook_router
        from app.api.admin import router as admin_router
        print("✅ API 라우터")
        
        # 메인 앱
        from app.main import app
        print("✅ FastAPI 앱")
        
        print("\n🎉 모든 앱 모듈 임포트 성공!")
        return True
        
    except Exception as e:
        print(f"❌ 앱 모듈 오류: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_basic_endpoints():
    """기본 엔드포인트 테스트"""
    try:
        print("\n🧪 기본 엔드포인트 테스트 시작...")
        
        from app.main import app
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        
        # Health check
        response = client.get("/health")
        print(f"✅ Health Check: {response.status_code} - {response.json()}")
        
        # Root endpoint
        response = client.get("/")
        print(f"✅ Root: {response.status_code}")
        
        # Webhook status
        response = client.get("/webhook/status")
        print(f"✅ Webhook Status: {response.status_code} - {response.json()}")
        
        print("\n🎉 기본 엔드포인트 테스트 성공!")
        return True
        
    except Exception as e:
        print(f"❌ 엔드포인트 테스트 오류: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("FastAPI 설정 테스트")
    print("=" * 60)
    
    success = True
    
    # 1. 기본 모듈 테스트
    if not test_basic_imports():
        success = False
    
    # 2. 앱 모듈 테스트  
    if success and not test_app_imports():
        success = False
    
    # 3. 엔드포인트 테스트
    if success and not test_basic_endpoints():
        success = False
    
    print("\n" + "=" * 60)
    if success:
        print("✅ 모든 테스트 통과! FastAPI 서버를 시작할 준비가 되었습니다.")
        print("실행 명령: python start_server.py")
    else:
        print("❌ 테스트 실패! 문제를 해결한 후 다시 시도하세요.")
        sys.exit(1)
    print("=" * 60)