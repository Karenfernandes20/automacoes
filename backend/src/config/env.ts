import path from 'node:path'; import { config } from 'dotenv'; import { z } from 'zod';
// npm workspaces inicia o backend com cwd=backend. Carregamos primeiro o .env
// da raiz e depois um .env local, caso exista.
config({ path: path.resolve(process.cwd(), '..', '.env') });
config({ path: path.resolve(process.cwd(), '.env'), override: true });
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
  ,SUPABASE_URL:z.string().default('')
  ,SUPABASE_SERVICE_ROLE_KEY:z.string().default('')
  ,FACEBOOK_APP_ID:z.string().default('')
  ,FACEBOOK_APP_SECRET:z.string().default('')
  ,FACEBOOK_REDIRECT_URI:z.string().default('http://localhost:3333/api/integrations/facebook/callback')
  ,FACEBOOK_GRAPH_VERSION:z.string().default('v24.0')
  ,SHOPEE_APP_ID:z.string().default('')
  ,SHOPEE_SECRET:z.string().default('')
});
export const env=schema.parse(process.env);
