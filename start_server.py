"""
FastAPI 서버 시작 스크립트
메신저 봇 R 연동 카카오톡 봇 서버
"""

import os
import sys
from pathlib import Path

# 프로젝트 루트를 파이썬 경로에 추가
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

if __name__ == "__main__":
    import uvicorn
    from app.core.config import settings
    
    print("🤖 카카오톡 메신저 봇 R 연동 서버를 시작합니다...")
    print(f"📍 서버 주소: http://{settings.HOST}:{settings.PORT}")
    print(f"📱 웹훅 URL: http://{settings.HOST}:{settings.PORT}/webhook/message")
    print(f"⚙️ 관리자 대시보드: http://{settings.HOST}:{settings.PORT}/admin/dashboard")
    print(f"📚 API 문서: http://{settings.HOST}:{settings.PORT}/docs")
    print("=" * 60)
    
    # 서버 실행
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        access_log=True,
        log_level="info"
    )