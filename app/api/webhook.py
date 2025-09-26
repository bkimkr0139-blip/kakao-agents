"""
웹훅 API 엔드포인트
메신저 봇 R 앱과의 통신을 위한 웹훅 처리
"""

from fastapi import APIRouter, HTTPException, Request
from loguru import logger
import time
from datetime import datetime

from app.models.message import IncomingMessage, ProcessedMessage, WebhookResponse
from app.services.openai_service import openai_service
from app.core.config import settings

router = APIRouter()

@router.post("/message", response_model=ProcessedMessage)
async def process_message(message: IncomingMessage):
    """
    메신저 봇 R에서 전송받은 메시지 처리
    
    이 엔드포인트는 메신저 봇 R 앱에서 카카오톡 메시지를 받아
    OpenAI LLM으로 처리한 후 응답을 반환합니다.
    """
    start_time = time.time()
    
    logger.info(f"📱 메시지 수신 - 방: {message.room}, 발신자: {message.sender}")
    logger.debug(f"메시지 내용: {message.message}")
    
    try:
        # OpenAI로 메시지 처리
        response_text = await openai_service.process_message(message.message)
        
        # 처리 시간 계산
        processing_time = time.time() - start_time
        
        # 응답 생성
        processed_message = ProcessedMessage(
            room=message.room,
            message=response_text,
            success=True,
            processing_time=round(processing_time, 2),
            model_used=settings.OPENAI_MODEL if openai_service.is_available() else None
        )
        
        logger.info(f"✅ 메시지 처리 완료 - {processing_time:.2f}초 소요")
        return processed_message
        
    except Exception as e:
        logger.error(f"❌ 메시지 처리 실패: {e}")
        
        # 에러 응답
        return ProcessedMessage(
            room=message.room,
            message="죄송합니다. 메시지 처리 중 오류가 발생했습니다.",
            success=False,
            processing_time=round(time.time() - start_time, 2),
            model_used=None
        )

@router.get("/status")
async def webhook_status():
    """웹훅 상태 확인"""
    return {
        "status": "active",
        "service": "카카오톡 메신저 봇 R 웹훅",
        "openai_available": openai_service.is_available(),
        "timestamp": datetime.now().isoformat()
    }

@router.post("/test", response_model=WebhookResponse)
async def test_webhook(request: dict):
    """웹훅 테스트 엔드포인트"""
    logger.info(f"🧪 웹훅 테스트 요청: {request}")
    
    # 테스트 메시지 생성
    test_message = IncomingMessage(
        room="테스트 채팅방",
        sender="테스트 사용자",
        message=request.get("message", "안녕하세요! 테스트 메시지입니다."),
        isGroupChat=False
    )
    
    # 메시지 처리
    result = await process_message(test_message)
    
    return WebhookResponse(
        status="success" if result.success else "error",
        message="웹훅 테스트 완료",
        data={
            "test_input": test_message.dict(),
            "test_output": result.dict()
        }
    )

@router.post("/summary")
async def create_summary(request: dict):
    """메시지 요약 전용 엔드포인트"""
    message = request.get("message", "")
    lines = request.get("lines", 3)
    
    if not message:
        raise HTTPException(status_code=400, detail="메시지가 필요합니다.")
    
    try:
        from app.models.message import MessageSummaryRequest
        summary_request = MessageSummaryRequest(
            message=message,
            lines=lines
        )
        
        summary = await openai_service.summarize_message(summary_request)
        
        return {
            "status": "success",
            "original_message": message,
            "summary": summary,
            "lines": lines,
            "model_used": settings.OPENAI_MODEL if openai_service.is_available() else None
        }
        
    except Exception as e:
        logger.error(f"요약 생성 실패: {e}")
        raise HTTPException(status_code=500, detail=f"요약 생성 중 오류: {str(e)}")

@router.get("/logs")
async def get_recent_logs(limit: int = 50):
    """최근 로그 조회 (개발/디버깅 용도)"""
    try:
        import os
        log_file = settings.LOG_FILE
        
        if not os.path.exists(log_file):
            return {"logs": [], "message": "로그 파일이 없습니다."}
        
        with open(log_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            recent_lines = lines[-limit:] if len(lines) > limit else lines
            
        return {
            "logs": [line.strip() for line in recent_lines],
            "total_lines": len(recent_lines),
            "log_file": log_file
        }
        
    except Exception as e:
        logger.error(f"로그 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"로그 조회 중 오류: {str(e)}")

# 메신저 봇 R 앱에서 사용할 설정 정보 제공
@router.get("/config")
async def get_webhook_config():
    """메신저 봇 R 설정을 위한 정보 제공"""
    return {
        "webhook_url": f"http://{settings.HOST}:{settings.PORT}/webhook/message",
        "test_url": f"http://{settings.HOST}:{settings.PORT}/webhook/test",
        "summary_url": f"http://{settings.HOST}:{settings.PORT}/webhook/summary",
        "status_url": f"http://{settings.HOST}:{settings.PORT}/webhook/status",
        "supported_methods": ["POST"],
        "content_type": "application/json",
        "example_payload": {
            "room": "친구와의 채팅",
            "sender": "홍길동",
            "message": "안녕하세요! 오늘 날씨가 좋네요.",
            "isGroupChat": False,
            "timestamp": int(time.time()),
            "packageName": "com.kakao.talk"
        }
    }