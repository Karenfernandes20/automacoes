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
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional()
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados inválidos', details: parsed.error.issues });
    return;
  }

  const user = await userService.getUser();
  if (parsed.data.email.toLowerCase() !== user.email.toLowerCase() || parsed.data.password !== user.password) {
    res.status(401).json({ error: 'E-mail ou senha incorretos' });
    return;
  }

  const token = jwt.sign(
    { sub: 'admin', email: user.email, role: 'ADMIN' },
    env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    success: true,
    data: {
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  });
});

authRouter.get('/me', requireAuth, async (_req, res) => {
  try {
    const user = await userService.getUser();
    res.json({
      success: true,
      data: {
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

authRouter.put('/profile', requireAuth, async (req, res) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Dados inválidos', details: parsed.error.issues });
      return;
    }

    const current = await userService.getUser();
    const { name, email, currentPassword, newPassword } = parsed.data;

    // Se forneceu nova senha, deve validar a senha atual
    if (newPassword) {
      if (!currentPassword || currentPassword !== current.password) {
        res.status(400).json({ success: false, error: 'A senha atual informada está incorreta.' });
        return;
      }
    }

    const updated = await userService.updateUser({
      name,
      email,
      password: newPassword
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
