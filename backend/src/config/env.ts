import 'dotenv/config'; import { z } from 'zod';
const schema=z.object({
  PORT:z.coerce.number().default(3333),
  NODE_ENV:z.enum(['development','test','production']).default('development'),
  JWT_SECRET:z.string().min(12).default('development-secret-change-me'),
  ADMIN_EMAIL:z.string().email().default('admin@centralofertas.local'),
  ADMIN_PASSWORD:z.string().min(8).default('demo1234'),
  FRONTEND_URL:z.string().default('http://localhost:5173'),
  MERCADOLIVRE_APP_ID:z.string().default('5253821874147056'),
  MERCADOLIVRE_CLIENT_SECRET:z.string().default('9Ynks8cBbwZ6Zarx3I75B3FMyUJg6HR3'),
  MERCADOLIVRE_REDIRECT_URI:z.string().default('https://176b7fc76c348814-189-49-70-230.serveousercontent.com/api/integrations/mercadolivre/callback'),
  WUZAPI_BASE_URL:z.string().default('https://integrai-wuzapi.nhvvzr.easypanel.host'),
  WUZAPI_ADMIN_TOKEN:z.string().default('icmyn358q3cym928vynm893x'),
  WUZAPI_USER_TOKEN:z.string().default('karenpessoal'),
  GEMINI_API_KEY:z.string().default(''),
  GOOGLE_API_KEY:z.string().default('')
});
export const env=schema.parse(process.env);
