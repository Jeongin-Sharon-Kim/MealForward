require('dotenv').config();
const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const { init, mirrorToJsonFile } = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const storeRoutes = require('./routes/store');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const batchRoutes = require('./routes/batch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// PostgreSQL이 실제 저장소지만, server/data/seed.json도 사람이 보기 편하도록 항상 최신 상태로 맞춰둔다.
// (회원가입/결제/이월 등 쓰기 요청이 끝날 때마다 전체 테이블을 다시 파일로 덤프한다.)
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    res.on('finish', () => {
      mirrorToJsonFile().catch((err) => console.error('[DB] Failed to mirror seed.json:', err.message));
    });
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/batch', batchRoutes);

const openapiDocument = YAML.load(path.join(__dirname, '..', 'spec', 'openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

// Express 4 doesn't forward rejected promises from async route handlers to its error
// handler, so an unexpected DB error would otherwise crash the whole process.
app.use((err, req, res, next) => {
  console.error('[Unhandled route error]', err);
  res.status(500).json({ errorCode: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' });
});

process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err);
});

async function main() {
  await init();
  await mirrorToJsonFile();

  app.listen(PORT, () => {
    console.log(`MealForward server running at http://localhost:${PORT}`);
    console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
    console.log('[DB] PostgreSQL is the source of truth; server/data/seed.json mirrors it after every write.');
    if (process.env.OPENAI_API_KEY) {
      console.log('[Guardrail AX] Using OpenAI (gpt-4o-mini) as the LLM classifier.');
    } else if (process.env.ANTHROPIC_API_KEY) {
      console.log('[Guardrail AX] Using Anthropic (claude-sonnet-5) as the LLM classifier.');
    } else {
      console.log('[Guardrail AX] No API key set — using rule-based fallback classifier.');
    }
    if (!process.env.ADMIN_SIGNUP_KEY) {
      console.log('[Auth] ADMIN_SIGNUP_KEY not set — admin signup will always be rejected. Set it in .env.');
    }
  });
}

main().catch((err) => {
  console.error('[DB] Failed to start server:', err.message);
  process.exit(1);
});
