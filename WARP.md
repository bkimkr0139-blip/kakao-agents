# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Setup and Installation
```bash
npm install                    # Install dependencies
cp .env.example .env          # Set up environment variables
```

### Running the Application
```bash
npm run dev                   # Development mode with nodemon
npm start                     # Production mode
npm run build                 # No build step for Node.js (placeholder)
```

### Testing and Quality
```bash
npm test                      # Run Jest tests
npm run test:watch           # Run tests in watch mode
npm run lint                  # Check code with ESLint
npm run lint:fix             # Fix ESLint issues automatically
```

### Testing Single Components
```bash
# Test webhook functionality
curl -X POST http://localhost:3000/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"message": "안녕하세요", "userId": "test-user"}'

# Check server health
curl http://localhost:3000/health

# Check webhook status  
curl http://localhost:3000/webhook/status
```

### Deployment
```bash
npm run deploy                # Run deployment script
```

## High-Level Architecture

This is a **KakaoTalk chatbot API server** built with **Node.js/Express** that provides AI-powered customer support through integration with **OpenAI GPT** and **Kakao i Open Builder**.

### Core Request Flow
```
KakaoTalk User → Kakao i Open Builder → Webhook → AI Service → KakaoTalk Response Format → User
```

### Key Architectural Components

#### 1. **Entry Point and Server Setup** (`src/app.js`)
- Express server with security middleware (helmet, CORS)
- Rate limiting and error handling
- Webhook routing setup
- Graceful shutdown handling

#### 2. **Webhook Controller** (`src/controllers/webhookController.js`)
- Receives and validates KakaoTalk webhook requests
- Extracts user messages, intent, and context information
- Orchestrates AI response generation
- Handles test endpoints for development

#### 3. **AI Service Layer** (`src/services/aiService.js`)
- **OpenAI GPT Integration**: Generates contextual responses using GPT models
- **Conversation Management**: Maintains in-memory conversation history per user session
- **Intent-based System Prompts**: Provides specialized prompts for different business scenarios (주문문의, 제품문의, 기술지원, 계정문의)
- **Response Analysis**: Structures AI responses and generates contextual quick replies
- **Session Management**: Auto-expires conversations after 1 hour for memory management

#### 4. **KakaoTalk Response Formatting** (`src/services/kakaoService.js`)
- Converts AI responses to KakaoTalk API v2.0 format
- Supports multiple response types: simple text, cards, carousels, lists
- Handles quick replies and interactive elements
- Business-specific response helpers (order info, product info, FAQ)

#### 5. **Middleware Layer**
- **Rate Limiter** (`src/middleware/rateLimiter.js`): IP-based (100 req/min) and user-based (30 req/min) rate limiting with bypass capabilities
- **Error Handler** (`src/middleware/errorHandler.js`): Comprehensive error handling with KakaoTalk-specific responses, custom error classes
- **Validation** (`src/middleware/validation.js`): Request validation for webhook payloads

#### 6. **Configuration Management** (`config/config.js`)
- Environment-aware configuration system
- OpenAI, rate limiting, logging, and security settings
- Database connection configs for future expansion
- Required configuration validation

#### 7. **Logging System** (`src/utils/logger.js`)
- Winston-based structured logging
- Separate log files for errors, exceptions, and combined logs
- Request/response logging helpers
- AI-specific logging methods

### Memory Management Strategy
- **In-memory conversation storage**: Uses Map() for storing user conversation history
- **Auto-cleanup**: Conversations automatically deleted after 1 hour
- **History limitation**: Maximum 20 messages per conversation to prevent memory bloat
- **Production consideration**: Code comments suggest using Redis or database for production scale

### Business Logic Flow
1. **Intent Recognition**: Uses Kakao i Open Builder's intent system (주문문의, 제품문의, etc.)
2. **Context-Aware Prompting**: System prompts adapted based on detected intent
3. **Response Generation**: OpenAI generates contextual Korean responses with business tone
4. **Quick Reply Generation**: Automatic generation of relevant quick reply options
5. **Format Conversion**: AI responses converted to KakaoTalk's JSON response format

### Security and Performance
- **Rate limiting** at both IP and user levels with admin bypass
- **Input validation** with message length limits (1000 characters)
- **Error handling** prevents system information leakage
- **CORS configuration** restricted to Kakao domains
- **Environment-based configuration** for secure credential management

### Development vs Production Differences
- **Development**: Debug logging, detailed error responses, optional config validation
- **Production**: Minimal logging, generic error messages, required config validation, compression enabled

This architecture is designed for **Korean business customer support** with KakaoTalk integration, providing scalable AI-powered responses while maintaining conversation context and business-appropriate interactions.