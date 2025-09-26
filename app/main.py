"""
카카오톡 메신저 봇 R 연동 FastAPI 서버
스마트폰 ↔ FastAPI 서버 ↔ OpenAI 구조
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from loguru import logger
import os
from pathlib import Path

from app.api.webhook import router as webhook_router
from app.api.admin import router as admin_router
from app.core.config import settings
from app.core.logging import setup_logging

# 로깅 설정
setup_logging()

# FastAPI 앱 생성
app = FastAPI(
    title="카카오톡 메신저 봇 R 연동 서버",
    description="메신저 봇 R 앱을 통한 카카오톡 메시지 처리 및 OpenAI LLM 연동",
    version="2.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(webhook_router, prefix="/webhook", tags=["webhook"])
app.include_router(admin_router, prefix="/admin", tags=["admin"])

# 정적 파일 서빙 (관리자 대시보드)
static_path = Path(__file__).parent / "static"
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

# 기존 public 폴더도 서빙 (호환성)
public_path = Path(__file__).parent.parent / "public"
if public_path.exists():
    app.mount("/public", StaticFiles(directory=str(public_path)), name="public")

@app.get("/", response_class=HTMLResponse)
async def root():
    """메인 페이지 - 관리자 대시보드로 리다이렉트"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>카카오톡 메신저 봇 R 서버</title>
        <meta charset="utf-8">
        <meta http-equiv="refresh" content="0; url=/admin/dashboard">
    </head>
    <body>
        <h1>카카오톡 메신저 봇 R 서버</h1>
        <p><a href="/admin/dashboard">관리자 대시보드로 이동</a></p>
    </body>
    </html>
    """

@app.get("/health")
async def health_check():
    """서버 상태 체크"""
    return {
        "status": "OK",
        "service": "카카오톡 메신저 봇 R 연동 서버",
        "version": "2.0.0",
        "messenger_bot_r": "연동 준비 완료"
    }

@app.get("/admin/dashboard", response_class=HTMLResponse)
async def admin_dashboard():
    """관리자 대시보드 페이지"""
    dashboard_file = public_path / "admin.html"
    if dashboard_file.exists():
        return FileResponse(str(dashboard_file))
    
    # 기본 대시보드 HTML
    return """
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <title>관리자 대시보드</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
            .status { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .endpoint { background: #f8f9fa; padding: 10px; margin: 10px 0; border-radius: 5px; font-family: monospace; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 카카오톡 메신저 봇 R 연동 서버</h1>
            
            <div class="status">
                <h3>✅ 서버 상태: 정상 운영중</h3>
                <p>메신저 봇 R 앱에서 이 서버로 메시지를 전송할 수 있습니다.</p>
            </div>
            
            <h3>📡 웹훅 엔드포인트</h3>
            <div class="endpoint">POST /webhook/message</div>
            <p>메신저 봇 R 앱에서 이 URL로 메시지를 전송하세요.</p>
            
            <h3>🔧 관리 기능</h3>
            <ul>
                <li><a href="/health">서버 상태 확인</a></li>
                <li><a href="/docs">API 문서</a></li>
                <li><a href="/admin/config">설정 관리</a></li>
            </ul>
            
            <h3>📱 메신저 봇 R 설정 방법</h3>
            <ol>
                <li>안드로이드 스마트폰에 "메신저 봇 R" 앱 설치</li>
                <li>앱에서 웹훅 URL 설정: <code>http://YOUR_SERVER_IP:8000/webhook/message</code></li>
                <li>카카오톡 알림 권한 허용</li>
                <li>봇 활성화</li>
            </ol>
        </div>
    </body>
    </html>
    """

@app.on_event("startup")
async def startup_event():
    """서버 시작 시 실행"""
    logger.info("🚀 카카오톡 메신저 봇 R 연동 서버가 시작되었습니다.")
    logger.info(f"📱 웹훅 엔드포인트: http://localhost:{settings.PORT}/webhook/message")
    logger.info(f"📋 관리자 대시보드: http://localhost:{settings.PORT}/admin/dashboard")
    logger.info(f"💊 Health Check: http://localhost:{settings.PORT}/health")

@app.on_event("shutdown")
async def shutdown_event():
    """서버 종료 시 실행"""
    logger.info("서버가 종료됩니다.")

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        access_log=True
    )