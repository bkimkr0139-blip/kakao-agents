const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * 관리자 대시보드용 간단한 인증 미들웨어
 * 기본 인증 또는 세션 기반 인증 지원
 */

// 세션 저장소 (실제 운영에서는 Redis 사용 권장)
const sessions = new Map();

/**
 * 패스워드 해시 함수 (간단한 구현 - 실제로는 bcrypt 사용 권장)
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'salt').digest('hex');
}

// 기본 관리자 계정 (환경변수로 설정 가능)
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123!',
  // 보안을 위해 패스워드 해시 저장 (실제로는 bcrypt 사용 권장)
  passwordHash: process.env.ADMIN_PASSWORD_HASH || hashPassword('admin123!')
};


/**
 * 세션 생성
 */
function createSession(username) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const session = {
    id: sessionId,
    username: username,
    createdAt: new Date(),
    lastActivity: new Date(),
    ipAddress: null
  };
  
  sessions.set(sessionId, session);
  
  // 24시간 후 세션 자동 만료
  setTimeout(() => {
    sessions.delete(sessionId);
  }, 24 * 60 * 60 * 1000);
  
  return sessionId;
}

/**
 * 세션 검증
 */
function validateSession(sessionId, ipAddress) {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }
  
  // IP 주소 검증 (선택사항)
  if (session.ipAddress && session.ipAddress !== ipAddress) {
    logger.warn('Session IP mismatch', { sessionId, expectedIP: session.ipAddress, actualIP: ipAddress });
    return null;
  }
  
  // 마지막 활동 시간 업데이트
  session.lastActivity = new Date();
  session.ipAddress = ipAddress;
  
  return session;
}

/**
 * 로그인 엔드포인트
 */
const loginHandler = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: '사용자명과 비밀번호를 입력해주세요.'
      });
    }
    
    // 자격 증명 검증
    const passwordHash = hashPassword(password);
    if (username !== ADMIN_CREDENTIALS.username || passwordHash !== ADMIN_CREDENTIALS.passwordHash) {
      logger.warn('Failed login attempt', { 
        username, 
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // 브루트 포스 공격 방지를 위한 지연
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return res.status(401).json({
        success: false,
        error: '잘못된 사용자명 또는 비밀번호입니다.'
      });
    }
    
    // 세션 생성
    const sessionId = createSession(username);
    
    logger.info('Admin login successful', { 
      username, 
      sessionId: sessionId.substring(0, 8) + '...', 
      ip: req.ip 
    });
    
    // 세션 쿠키 설정
    res.cookie('admin_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24시간
      sameSite: 'strict'
    });
    
    res.json({
      success: true,
      message: '로그인되었습니다.',
      user: { username }
    });
    
  } catch (error) {
    logger.error('Login handler error:', error);
    res.status(500).json({
      success: false,
      error: '로그인 처리 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 로그아웃 엔드포인트
 */
const logoutHandler = (req, res) => {
  try {
    const sessionId = req.cookies?.admin_session;
    
    if (sessionId && sessions.has(sessionId)) {
      sessions.delete(sessionId);
      logger.info('Admin logout', { sessionId: sessionId.substring(0, 8) + '...' });
    }
    
    res.clearCookie('admin_session');
    res.json({
      success: true,
      message: '로그아웃되었습니다.'
    });
    
  } catch (error) {
    logger.error('Logout handler error:', error);
    res.status(500).json({
      success: false,
      error: '로그아웃 처리 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 인증 확인 미들웨어
 */
const requireAuth = (req, res, next) => {
  try {
    // 개발 환경에서 인증 비활성화 옵션
    if (process.env.DISABLE_ADMIN_AUTH === 'true' && process.env.NODE_ENV === 'development') {
      return next();
    }
    
    const sessionId = req.cookies?.admin_session;
    
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다.',
        code: 'NO_SESSION'
      });
    }
    
    const session = validateSession(sessionId, req.ip);
    if (!session) {
      res.clearCookie('admin_session');
      return res.status(401).json({
        success: false,
        error: '세션이 만료되었습니다.',
        code: 'INVALID_SESSION'
      });
    }
    
    // 요청에 사용자 정보 추가
    req.adminUser = {
      username: session.username,
      sessionId: session.id
    };
    
    next();
    
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: '인증 처리 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 선택적 인증 미들웨어 (인증되지 않아도 접근 가능, 하지만 인증 정보는 제공)
 */
const optionalAuth = (req, res, next) => {
  try {
    const sessionId = req.cookies?.admin_session;
    
    if (sessionId) {
      const session = validateSession(sessionId, req.ip);
      if (session) {
        req.adminUser = {
          username: session.username,
          sessionId: session.id
        };
      }
    }
    
    next();
    
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next(); // 에러가 발생해도 계속 진행
  }
};

/**
 * 세션 상태 확인 엔드포인트
 */
const statusHandler = (req, res) => {
  try {
    const sessionId = req.cookies?.admin_session;
    
    if (!sessionId) {
      return res.json({
        success: true,
        authenticated: false
      });
    }
    
    const session = validateSession(sessionId, req.ip);
    if (!session) {
      res.clearCookie('admin_session');
      return res.json({
        success: true,
        authenticated: false
      });
    }
    
    res.json({
      success: true,
      authenticated: true,
      user: {
        username: session.username,
        lastActivity: session.lastActivity
      }
    });
    
  } catch (error) {
    logger.error('Auth status handler error:', error);
    res.status(500).json({
      success: false,
      error: '인증 상태 확인 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 세션 정리 (정기적으로 만료된 세션 제거)
 */
function cleanupSessions() {
  const now = new Date();
  const maxAge = 24 * 60 * 60 * 1000; // 24시간
  
  for (const [sessionId, session] of sessions.entries()) {
    if (now.getTime() - session.lastActivity.getTime() > maxAge) {
      sessions.delete(sessionId);
    }
  }
}

// 1시간마다 세션 정리
setInterval(cleanupSessions, 60 * 60 * 1000);

module.exports = {
  loginHandler,
  logoutHandler,
  statusHandler,
  requireAuth,
  optionalAuth,
  hashPassword,
  createSession,
  validateSession
};