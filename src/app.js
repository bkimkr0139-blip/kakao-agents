const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');
const webhookController = require('./controllers/webhookController');
const messengerBotController = require('./controllers/messengerBotController');
const adminController = require('./controllers/adminController');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const rateLimiterModule = require('./middleware/rateLimiter');
const rateLimiter = rateLimiterModule.default || rateLimiterModule.rateLimiterMiddleware;
const adminAuth = require('./middleware/adminAuth');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://builder.kakao.com'],
  credentials: true
}));

// Request parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Rate limiting
app.use('/webhook', rateLimiter);

// Static files for admin dashboard
app.use('/admin', express.static(path.join(__dirname, '../public')));

// Admin dashboard routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Admin authentication routes (no auth required)
app.post('/admin/auth/login', adminAuth.loginHandler);
app.post('/admin/auth/logout', adminAuth.logoutHandler);
app.get('/admin/auth/status', adminAuth.statusHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'KakaoTalk Business Agent'
  });
});

// API routes
app.use('/webhook', webhookController);
app.use('/webhook/messenger-bot-r', messengerBotController);

// Admin API routes (authentication required)
app.use('/admin', adminAuth.requireAuth, adminController);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`🚀 KakaoTalk Business Agent server running on port ${PORT}`);
    logger.info(`📱 Webhook endpoint: http://localhost:${PORT}/webhook/kakaotalk`);
    logger.info(`📱 Messenger Bot R endpoint: http://localhost:${PORT}/webhook/messenger-bot-r/message`);
    logger.info(`💊 Health check: http://localhost:${PORT}/health`);
    logger.info(`📋 Admin dashboard: http://localhost:${PORT}/admin`);
  });
}

module.exports = app;