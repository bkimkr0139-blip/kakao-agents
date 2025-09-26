"""
메시지 처리를 위한 데이터 모델
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class IncomingMessage(BaseModel):
    """메신저 봇 R에서 받는 메시지 모델"""
    room: str = Field(..., description="채팅방 이름")
    sender: str = Field(..., description="발신자 이름")
    message: str = Field(..., description="메시지 내용")
    isGroupChat: bool = Field(default=False, description="그룹 채팅 여부")
    timestamp: Optional[int] = Field(default=None, description="타임스탬프")
    packageName: Optional[str] = Field(default="com.kakao.talk", description="앱 패키지명")
    
    class Config:
        schema_extra = {
            "example": {
                "room": "친구와의 채팅",
                "sender": "홍길동",
                "message": "안녕하세요! 오늘 날씨가 좋네요.",
                "isGroupChat": False,
                "timestamp": 1640995200,
                "packageName": "com.kakao.talk"
            }
        }

class ProcessedMessage(BaseModel):
    """처리된 메시지 응답 모델"""
    room: str = Field(..., description="채팅방 이름")
    message: str = Field(..., description="응답 메시지")
    success: bool = Field(default=True, description="처리 성공 여부")
    processing_time: Optional[float] = Field(default=None, description="처리 시간 (초)")
    model_used: Optional[str] = Field(default=None, description="사용된 LLM 모델")
    
    class Config:
        schema_extra = {
            "example": {
                "room": "친구와의 채팅",
                "message": "안녕하세요! 좋은 하루 되세요.",
                "success": True,
                "processing_time": 1.23,
                "model_used": "gpt-4o-mini"
            }
        }

class MessageSummaryRequest(BaseModel):
    """메시지 요약 요청"""
    message: str = Field(..., description="요약할 메시지")
    lines: int = Field(default=3, description="요약할 줄 수", ge=1, le=10)
    language: str = Field(default="ko", description="응답 언어")
    
    class Config:
        schema_extra = {
            "example": {
                "message": "오늘 회사에서 중요한 회의가 있었어요. 새로운 프로젝트에 대한 논의였는데...",
                "lines": 3,
                "language": "ko"
            }
        }

class WebhookResponse(BaseModel):
    """웹훅 응답 표준 형식"""
    status: str = Field(..., description="응답 상태")
    message: str = Field(..., description="응답 메시지")
    data: Optional[Dict[str, Any]] = Field(default=None, description="추가 데이터")
    timestamp: datetime = Field(default_factory=datetime.now, description="응답 시간")
    
    class Config:
        schema_extra = {
            "example": {
                "status": "success",
                "message": "메시지가 성공적으로 처리되었습니다.",
                "data": {"processed_count": 1},
                "timestamp": "2024-01-01T12:00:00Z"
            }
        }