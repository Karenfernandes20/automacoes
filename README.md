# Central de Ofertas

Plataforma full-stack para curadoria, aprovação e divulgação de ofertas. Todos os produtos e valores incluídos são demonstrativos.

## Rodando localmente

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

- Website: http://localhost:5173
- API: http://localhost:3333/api
- Admin: http://localhost:5173/admin
- Login demonstrativo: `admin@centralofertas.local` / `demo1234`

Para iniciar separadamente: `npm run dev -w frontend` e `npm run dev -w backend`.

## Comandos

- `npm run dev` — frontend e backend
- `npm run build` — build de produção
- `npm run typecheck` — validação TypeScript
- `npm run lint` — análise estática
- `npm start` — backend compilado

## Persistência

O CRUD usa um repositório JSON local na fase demonstrativa. O schema PostgreSQL/Prisma está em `backend/prisma/schema.prisma`, preparado para a migração na próxima etapa.
