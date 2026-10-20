import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { userService } from '../services/user.service.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const updateProfileSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
  role: z.string().optional()
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string().default('Operador')
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados inválidos', details: parsed.error.issues });
    return;
  }

  const user = await userService.findByEmail(parsed.data.email);
  if (!user || user.password !== parsed.data.password) {
    res.status(401).json({ error: 'E-mail ou senha incorretos' });
    return;
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  });
});

// Retorna dados do usuário autenticado atual
authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/, '') || '';
    const payload = jwt.decode(token) as { sub?: string; email?: string } | null;
    let user = payload?.sub ? await userService.findById(payload.sub) : undefined;
    if (!user && payload?.email) {
      user = await userService.findByEmail(payload.email);
    }
    if (!user) {
      const all = await userService.listUsers();
      user = all[0];
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        updatedAt: user.updatedAt
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao buscar dados do usuário';
    res.status(500).json({ success: false, error: msg });
  }
});

// Lista todos os usuários cadastrados
authRouter.get('/users', requireAuth, async (_req, res) => {
  try {
    const users = await userService.listUsers();
    const safeUsers = users.map(({ password: _, ...u }) => u);
    res.json({
      success: true,
      data: safeUsers
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao listar usuários';
    res.status(500).json({ success: false, error: msg });
  }
});

// Cria um novo usuário/acesso
authRouter.post('/users', requireAuth, async (req, res) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Dados inválidos', details: parsed.error.issues });
      return;
    }

    const newUser = await userService.createUser(parsed.data);
    res.status(201).json({
      success: true,
      data: newUser,
      message: 'Acesso criado com sucesso!'
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar usuário';
    res.status(400).json({ success: false, error: msg });
  }
});

// Atualiza o perfil do usuário atual ou de um usuário específico
authRouter.put('/profile', requireAuth, async (req, res) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Dados inválidos', details: parsed.error.issues });
      return;
    }

    const token = req.headers.authorization?.replace(/^Bearer\s+/, '') || '';
    const payload = jwt.decode(token) as { sub?: string; email?: string } | null;
    let targetId = parsed.data.id || payload?.sub;

    let current = targetId ? await userService.findById(targetId) : undefined;
    if (!current && payload?.email) {
      current = await userService.findByEmail(payload.email);
      targetId = current?.id;
    }
    if (!current) {
      const all = await userService.listUsers();
      current = all[0];
      targetId = current.id;
    }

    const { name, email, currentPassword, newPassword, role } = parsed.data;

    // Se forneceu nova senha, deve validar a senha atual se for ele mesmo
    if (newPassword) {
      if (currentPassword && currentPassword !== current.password) {
        res.status(400).json({ success: false, error: 'A senha atual informada está incorreta.' });
        return;
      }
    }

    const updated = await userService.updateUser(targetId!, {
      name,
      email,
      password: newPassword,
      role
    });

    res.json({
      success: true,
      data: updated,
      message: 'Dados de acesso atualizados com sucesso!'
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar dados';
    res.status(500).json({ success: false, error: msg });
  }
});

// Exclui um usuário
authRouter.delete('/users/:id', requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const ok = await userService.deleteUser(id);
    if (!ok) {
      res.status(404).json({ success: false, error: 'Usuário não encontrado' });
      return;
    }
    res.json({ success: true, message: 'Usuário removido com sucesso' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao remover usuário';
    res.status(400).json({ success: false, error: msg });
  }
});
