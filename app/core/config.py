"""
환경 설정 관리
"""

from pydantic_settings import BaseSettings
from typing import List
import os
from pathlib import Path

# 프로젝트 루트 디렉토리
BASE_DIR = Path(__file__).parent.parent.parent

class Settings(BaseSettings):
    # 서버 설정
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True
    
    # OpenAI 설정
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_MAX_TOKENS: int = 500
    OPENAI_TEMPERATURE: float = 0.7
    
    # 메신저 봇 R 설정
    MESSENGER_BOT_WEBHOOK_SECRET: str = ""
    ALLOWED_ORIGINS: List[str] = ["*"]
    
    # 로깅 설정
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = str(BASE_DIR / "logs" / "app.log")
    LOG_ROTATION: str = "1 day"
    LOG_RETENTION: str = "7 days"
    
    # 관리자 설정
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "password123"
    
    # 세션 설정
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    
    class Config:
        env_file = str(BASE_DIR / ".env")
        case_sensitive = True

settings = Settings()

# 로그 디렉토리 생성
log_dir = Path(settings.LOG_FILE).parent
log_dir.mkdir(exist_ok=True)