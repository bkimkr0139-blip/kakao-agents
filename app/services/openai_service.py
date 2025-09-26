"""
OpenAI LLM 서비스
"""

from openai import AsyncOpenAI
from loguru import logger
from typing import Optional
import time

from app.core.config import settings
from app.models.message import MessageSummaryRequest

class OpenAIService:
    """OpenAI API 서비스 클래스"""
    
    def __init__(self):
        self.client: Optional[AsyncOpenAI] = None
        self._initialize_client()
    
    def _initialize_client(self):
        """OpenAI 클라이언트 초기화"""
        if settings.OPENAI_API_KEY:
            try:
                self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                logger.info("OpenAI 클라이언트가 초기화되었습니다.")
            except Exception as e:
                logger.error(f"OpenAI 클라이언트 초기화 실패: {e}")
                self.client = None
        else:
            logger.warning("OpenAI API 키가 설정되지 않았습니다.")
            self.client = None
    
    def is_available(self) -> bool:
        """OpenAI 서비스 사용 가능 여부 확인"""
        return self.client is not None
    
    async def summarize_message(self, request: MessageSummaryRequest) -> str:
        """메시지를 요약합니다."""
        if not self.is_available():
            return "OpenAI 서비스를 사용할 수 없습니다. API 키를 확인해주세요."
        
        try:
            # 시스템 프롬프트 생성
            system_prompt = f"""당신은 한국어 메시지를 {request.lines}줄로 간결하게 요약하는 전문가입니다.
다음 규칙을 따라주세요:
1. 정확히 {request.lines}줄로 요약하세요.
2. 핵심 내용만 포함하세요.
3. 자연스러운 한국어로 작성하세요.
4. 불필요한 부사나 형용사는 제거하세요.
5. 중요한 정보는 빠뜨리지 마세요."""
            
            # 사용자 프롬프트
            user_prompt = f"다음 메시지를 {request.lines}줄로 요약해주세요:\n\n{request.message}"
            
            # OpenAI API 호출
            response = await self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=settings.OPENAI_MAX_TOKENS,
                temperature=settings.OPENAI_TEMPERATURE
            )
            
            summary = response.choices[0].message.content.strip()
            logger.info(f"메시지 요약 완료: {len(request.message)} -> {len(summary)} 문자")
            return summary
            
        except Exception as e:
            logger.error(f"메시지 요약 중 오류 발생: {e}")
            return f"요약 처리 중 오류가 발생했습니다: {str(e)}"
    
    async def process_message(self, message: str) -> str:
        """메시지를 처리하고 응답을 생성합니다."""
        if not self.is_available():
            return "안녕하세요! 현재 AI 서비스가 일시적으로 사용할 수 없습니다."
        
        try:
            # 기본적으로 3줄 요약으로 처리
            request = MessageSummaryRequest(message=message, lines=3)
            summary = await self.summarize_message(request)
            
            # 요약이 성공적이면 반환, 아니면 기본 응답
            if "오류가 발생했습니다" not in summary:
                return f"📝 메시지 요약:\n{summary}"
            else:
                return summary
                
        except Exception as e:
            logger.error(f"메시지 처리 중 오류 발생: {e}")
            return "메시지 처리 중 문제가 발생했습니다."
    
    async def test_connection(self) -> dict:
        """OpenAI 연결 테스트"""
        if not self.is_available():
            return {
                "success": False,
                "message": "OpenAI API 키가 설정되지 않았습니다."
            }
        
        try:
            start_time = time.time()
            
            # 간단한 테스트 요청
            response = await self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[{"role": "user", "content": "안녕하세요"}],
                max_tokens=10
            )
            
            end_time = time.time()
            response_time = round((end_time - start_time) * 1000, 2)  # ms
            
            return {
                "success": True,
                "message": "OpenAI API 연결 성공",
                "model": settings.OPENAI_MODEL,
                "response_time_ms": response_time,
                "response": response.choices[0].message.content.strip()
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"OpenAI API 연결 실패: {str(e)}"
            }

# 전역 서비스 인스턴스
openai_service = OpenAIService()