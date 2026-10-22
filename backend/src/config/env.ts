import 'dotenv/config'; import { z } from 'zod';
const schema=z.object({
  PORT:z.coerce.number().default(3333),
  NODE_ENV:z.enum(['development','test','production']).default('development'),
  JWT_SECRET:z.string().min(12).default('development-secret-change-me'),
  ADMIN_EMAIL:z.string().email().default('dev.karenfernandes@gmail.com'),
  ADMIN_PASSWORD:z.string().min(8).default('Klpf1212!'),
  FRONTEND_URL:z.string().default('http://localhost:5173'),
  DATA_DIR:z.string().default(''),
  MERCADOLIVRE_APP_ID:z.string().default(''),
  MERCADOLIVRE_CLIENT_SECRET:z.string().default(''),
  MERCADOLIVRE_REDIRECT_URI:z.string().default('http://localhost:3333/api/integrations/mercadolivre/callback'),
  WUZAPI_BASE_URL:z.string().default(''),
  WUZAPI_ADMIN_TOKEN:z.string().default(''),
  WUZAPI_USER_TOKEN:z.string().default(''),
  GEMINI_API_KEY:z.string().default(''),
  GOOGLE_API_KEY:z.string().default('')
});
export const env=schema.parse(process.env);
