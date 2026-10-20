import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

export interface UserProfile {
  name: string;
  email: string;
  password: string;
  role: string;
  updatedAt: string;
}

const userFile = path.resolve(process.cwd(), 'user-settings.json');
let cachedUser: UserProfile | null = null;

export const userService = {
  async getUser(): Promise<UserProfile> {
    if (cachedUser) return cachedUser;
    try {
      const data = await fs.readFile(userFile, 'utf8');
      cachedUser = JSON.parse(data) as UserProfile;
    } catch {
      cachedUser = {
        name: 'Marina Costa',
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
        role: 'Administradora',
        updatedAt: new Date().toISOString()
      };
      await fs.writeFile(userFile, JSON.stringify(cachedUser, null, 2));
    }
    return cachedUser;
  },

  async updateUser(data: { name?: string; email?: string; password?: string }): Promise<Omit<UserProfile, 'password'>> {
    const current = await this.getUser();
    const updated: UserProfile = {
      ...current,
      name: data.name?.trim() || current.name,
      email: data.email?.trim().toLowerCase() || current.email,
      password: data.password && data.password.trim().length >= 6 ? data.password.trim() : current.password,
      updatedAt: new Date().toISOString()
    };
    cachedUser = updated;
    await fs.writeFile(userFile, JSON.stringify(updated, null, 2));
    const { password: _, ...safeUser } = updated;
    return safeUser;
  }
};
