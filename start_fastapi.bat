@echo off
echo =========================================
echo 카카오톡 메신저 봇 R 연동 FastAPI 서버 시작
echo =========================================
echo.

REM Python 설치 확인
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python이 설치되지 않았거나 PATH에 없습니다.
    echo Python 3.8 이상을 설치하고 PATH에 추가해주세요.
    pause
    exit /b 1
)

echo 🐍 Python 버전 확인 중...
python --version

echo.
echo 📦 필요한 패키지 설치 중...
python -m pip install -r requirements.txt

echo.
echo 🚀 FastAPI 서버 시작 중...
echo 웹훅 URL: http://127.0.0.1:8000/webhook/message
echo 관리자 대시보드: http://127.0.0.1:8000/admin/dashboard
echo API 문서: http://127.0.0.1:8000/docs
echo.

python start_server.py

pause