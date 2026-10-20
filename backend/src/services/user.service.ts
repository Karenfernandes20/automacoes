import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

const usersFile = path.resolve(process.cwd(), 'users.json');
const legacyUserFile = path.resolve(process.cwd(), 'user-settings.json');
let memoryUsers: UserAccount[] | null = null;

export const userService = {
  async listUsers(): Promise<UserAccount[]> {
    if (memoryUsers) return memoryUsers;
    try {
      const data = await fs.readFile(usersFile, 'utf8');
      memoryUsers = JSON.parse(data) as UserAccount[];
    } catch {
      // Migra legado ou inicia com o administrador padrão
      let initialUser: UserAccount;
      try {
        const leg = JSON.parse(await fs.readFile(legacyUserFile, 'utf8'));
        initialUser = {
          id: randomUUID(),
          name: leg.name || 'Karen Fernandes',
          email: leg.email || env.ADMIN_EMAIL || 'dev.karenfernandes@gmail.com',
          password: leg.password || env.ADMIN_PASSWORD || 'Klpf1212!',
          role: leg.role || 'Administradora',
          createdAt: new Date().toISOString(),
          updatedAt: leg.updatedAt || new Date().toISOString()
        };
      } catch {
        initialUser = {
          id: randomUUID(),
          name: 'Karen Fernandes',
          email: env.ADMIN_EMAIL || 'dev.karenfernandes@gmail.com',
          password: env.ADMIN_PASSWORD || 'Klpf1212!',
          role: 'Administradora',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      memoryUsers = [initialUser];
      await this.save(memoryUsers);
    }
    return memoryUsers;
  },

  async save(users: UserAccount[]): Promise<void> {
    memoryUsers = users;
    await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
  },

  async findByEmail(email: string): Promise<UserAccount | undefined> {
    const users = await this.listUsers();
    return users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  },

  async findById(id: string): Promise<UserAccount | undefined> {
    const users = await this.listUsers();
    return users.find(u => u.id === id);
  },

  async createUser(data: { name: string; email: string; password: string; role?: string }): Promise<Omit<UserAccount, 'password'>> {
    const users = await this.listUsers();
    const cleanEmail = data.email.trim().toLowerCase();
    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('Já existe um usuário cadastrado com este e-mail.');
    }

    const now = new Date().toISOString();
    const newUser: UserAccount = {
      id: randomUUID(),
      name: data.name.trim(),
      email: cleanEmail,
      password: data.password.trim(),
      role: data.role?.trim() || 'Operador',
      createdAt: now,
      updatedAt: now
    };

    users.push(newUser);
    await this.save(users);

    const { password: _, ...safeUser } = newUser;
    return safeUser;
  },

  async updateUser(id: string, data: { name?: string; email?: string; password?: string; role?: string }): Promise<Omit<UserAccount, 'password'>> {
    const users = await this.listUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx < 0) {
      throw new Error('Usuário não encontrado.');
    }

    if (data.email) {
      const cleanEmail = data.email.trim().toLowerCase();
      const duplicate = users.find(u => u.email.toLowerCase() === cleanEmail && u.id !== id);
      if (duplicate) {
        throw new Error('Este e-mail já está em uso por outro usuário.');
      }
      users[idx].email = cleanEmail;
    }

    if (data.name) users[idx].name = data.name.trim();
    if (data.role) users[idx].role = data.role.trim();
    if (data.password && data.password.trim().length >= 6) {
      users[idx].password = data.password.trim();
    }
    users[idx].updatedAt = new Date().toISOString();

    await this.save(users);
    const { password: _, ...safeUser } = users[idx];
    return safeUser;
  },

  async deleteUser(id: string): Promise<boolean> {
    const users = await this.listUsers();
    if (users.length <= 1) {
      throw new Error('Não é possível excluir o único usuário do sistema.');
    }
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) return false;
    await this.save(filtered);
    return true;
  }
};
