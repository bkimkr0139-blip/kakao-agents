"""
관리자 API 엔드포인트
FastAPI 기반 관리 대시보드
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from loguru import logger
from typing import Dict, Any
import secrets
import os

from app.core.config import settings
from app.services.openai_service import openai_service

router = APIRouter()
security = HTTPBasic()

def verify_admin_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    """관리자 인증 확인"""
    is_correct_username = secrets.compare_digest(credentials.username, settings.ADMIN_USERNAME)
    is_correct_password = secrets.compare_digest(credentials.password, settings.ADMIN_PASSWORD)
    
    if not (is_correct_username and is_correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="관리자 인증이 필요합니다.",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

@router.get("/config")
async def get_config(admin: str = Depends(verify_admin_credentials)):
    """현재 설정 조회"""
    return {
        "server": {
            "host": settings.HOST,
            "port": settings.PORT,
            "debug": settings.DEBUG
        },
        "openai": {
            "api_key_set": bool(settings.OPENAI_API_KEY),
            "model": settings.OPENAI_MODEL,
            "max_tokens": settings.OPENAI_MAX_TOKENS,
            "temperature": settings.OPENAI_TEMPERATURE,
            "available": openai_service.is_available()
        },
        "messenger_bot": {
            "webhook_secret_set": bool(settings.MESSENGER_BOT_WEBHOOK_SECRET),
            "allowed_origins": settings.ALLOWED_ORIGINS
        },
        "logging": {
            "level": settings.LOG_LEVEL,
            "file": settings.LOG_FILE,
            "rotation": settings.LOG_ROTATION,
            "retention": settings.LOG_RETENTION
        }
    }

@router.post("/config/openai")
async def update_openai_config(
    config: Dict[str, Any], 
    admin: str = Depends(verify_admin_credentials)
):
    """OpenAI 설정 업데이트"""
    try:
        # 설정 업데이트
        if "api_key" in config:
            settings.OPENAI_API_KEY = config["api_key"]
            # 새 API 키로 서비스 재초기화
            openai_service._initialize_client()
        
        if "model" in config:
            settings.OPENAI_MODEL = config["model"]
        
        if "max_tokens" in config:
            settings.OPENAI_MAX_TOKENS = int(config["max_tokens"])
        
        if "temperature" in config:
            settings.OPENAI_TEMPERATURE = float(config["temperature"])
        
        logger.info(f"관리자 {admin}이 OpenAI 설정을 업데이트했습니다.")
        
        return {
            "status": "success",
            "message": "OpenAI 설정이 업데이트되었습니다.",
            "openai_available": openai_service.is_available()
        }
        
    except Exception as e:
        logger.error(f"OpenAI 설정 업데이트 실패: {e}")
        raise HTTPException(status_code=500, detail=f"설정 업데이트 실패: {str(e)}")

@router.post("/test/openai")
async def test_openai_connection(admin: str = Depends(verify_admin_credentials)):
    """OpenAI 연결 테스트"""
    result = await openai_service.test_connection()
    
    if result["success"]:
        return result
    else:
        raise HTTPException(status_code=500, detail=result["message"])

@router.get("/stats")
async def get_stats(admin: str = Depends(verify_admin_credentials)):
    """서버 통계 조회"""
    import psutil
    import datetime
    
    # 시스템 정보
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    # Windows에서는 C: 드라이브 사용
    import platform
    if platform.system() == 'Windows':
        disk = psutil.disk_usage('C:\\')
    else:
        disk = psutil.disk_usage('/')
    
    # 로그 파일 크기
    log_size = 0
    if os.path.exists(settings.LOG_FILE):
        log_size = os.path.getsize(settings.LOG_FILE)
    
    return {
        "system": {
            "cpu_usage": f"{cpu_percent}%",
            "memory_usage": f"{memory.percent}%",
            "memory_available": f"{memory.available / (1024**3):.1f} GB",
            "disk_usage": f"{disk.percent}%",
            "disk_free": f"{disk.free / (1024**3):.1f} GB"
        },
        "service": {
            "openai_available": openai_service.is_available(),
            "openai_model": settings.OPENAI_MODEL,
            "log_file_size": f"{log_size / 1024:.1f} KB" if log_size else "0 KB",
            "uptime": "서버 실행 중"
        },
        "config": {
            "debug_mode": settings.DEBUG,
            "log_level": settings.LOG_LEVEL,
            "webhook_configured": bool(settings.MESSENGER_BOT_WEBHOOK_SECRET)
        },
        "timestamp": datetime.datetime.now().isoformat()
    }

@router.get("/logs")
async def get_logs(
    limit: int = 100,
    admin: str = Depends(verify_admin_credentials)
):
    """로그 조회"""
    try:
        if not os.path.exists(settings.LOG_FILE):
            return {"logs": [], "message": "로그 파일이 존재하지 않습니다."}
        
        with open(settings.LOG_FILE, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            recent_lines = lines[-limit:] if len(lines) > limit else lines
        
        return {
            "logs": [line.strip() for line in recent_lines],
            "total_lines": len(recent_lines),
            "file_path": settings.LOG_FILE
        }
        
    except Exception as e:
        logger.error(f"로그 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"로그 조회 중 오류: {str(e)}")

@router.post("/logs/clear")
async def clear_logs(admin: str = Depends(verify_admin_credentials)):
    """로그 파일 초기화"""
    try:
        if os.path.exists(settings.LOG_FILE):
            with open(settings.LOG_FILE, 'w', encoding='utf-8') as f:
                f.write("")
            
            logger.info(f"관리자 {admin}이 로그 파일을 초기화했습니다.")
            return {"status": "success", "message": "로그 파일이 초기화되었습니다."}
        else:
            return {"status": "info", "message": "로그 파일이 존재하지 않습니다."}
            
    except Exception as e:
        logger.error(f"로그 초기화 실패: {e}")
        raise HTTPException(status_code=500, detail=f"로그 초기화 중 오류: {str(e)}")

@router.get("/models")
async def get_available_models():
    """사용 가능한 OpenAI 모델 목록"""
    return {
        "models": [
            {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "description": "빠르고 효율적인 모델"},
            {"id": "gpt-4o", "name": "GPT-4o", "description": "최신 GPT-4 모델"},
            {"id": "gpt-4", "name": "GPT-4", "description": "고성능 GPT-4 모델"},
            {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "description": "빠른 응답 모델"}
        ],
        "current_model": settings.OPENAI_MODEL
    }

@router.post("/webhook/test")
async def test_webhook_from_admin(
    test_data: Dict[str, Any],
    admin: str = Depends(verify_admin_credentials)
):
    """관리자에서 웹훅 테스트"""
    from app.models.message import IncomingMessage
    from app.api.webhook import process_message
    
    try:
        # 테스트 메시지 생성
        test_message = IncomingMessage(
            room=test_data.get("room", "관리자 테스트"),
            sender=test_data.get("sender", "관리자"),
            message=test_data.get("message", "테스트 메시지입니다."),
            isGroupChat=test_data.get("isGroupChat", False)
        )
        
        # 웹훅 처리
        result = await process_message(test_message)
        
        logger.info(f"관리자 {admin}이 웹훅 테스트를 실행했습니다.")
        
        return {
            "status": "success",
            "message": "웹훅 테스트 완료",
            "input": test_message.dict(),
            "output": result.dict()
        }
        
    except Exception as e:
        logger.error(f"관리자 웹훅 테스트 실패: {e}")
        raise HTTPException(status_code=500, detail=f"웹훅 테스트 중 오류: {str(e)}")

@router.get("/info")
async def get_server_info():
    """서버 정보 (인증 불필요)"""
    return {
        "service": "카카오톡 메신저 봇 R 연동 서버",
        "version": "2.0.0",
        "status": "running",
        "webhook_endpoint": f"http://{settings.HOST}:{settings.PORT}/webhook/message",
        "admin_endpoint": f"http://{settings.HOST}:{settings.PORT}/admin",
        "docs_available": settings.DEBUG
    }