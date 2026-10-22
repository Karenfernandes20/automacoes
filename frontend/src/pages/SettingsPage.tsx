import { FormEvent, useEffect, useState } from 'react';
import { 
  Check, 
  KeyRound, 
  Mail, 
  RefreshCw, 
  Save, 
  ShieldCheck, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle,
  BadgeCheck,
  UserPlus,
  Trash2,
  Users,
  Shield
} from 'lucide-react';
import { api } from '../lib/api';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<UserItem | null>(null);
  const [usersList, setUsersList] = useState<UserItem[]>([]);

  // Formulário do usuário atual
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Administradora');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Formulário de novo usuário
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('Operador');

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [showNewUserPass, setShowNewUserPass] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const [profile, users] = await Promise.all([
        api.getProfile().catch(() => null),
        api.listUsers().catch(() => [])
      ]);

      if (profile) {
        setCurrentUser(profile as UserItem);
        setName(profile.name || '');
        setEmail(profile.email || '');
        setRole(profile.role || 'Administradora');
      }
      setUsersList(users);
    } catch (err: unknown) {
      console.error('Falha ao carregar acessos:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (newPassword) {
      if (newPassword.length < 6) {
        setFeedback({ type: 'error', message: 'A nova senha deve ter no mínimo 6 caracteres.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setFeedback({ type: 'error', message: 'A confirmação de senha não coincide com a nova senha.' });
        return;
      }
      if (!currentPassword) {
        setFeedback({ type: 'error', message: 'Informe sua senha atual para confirmar a troca de senha.' });
        return;
      }
    }

    try {
      setSaving(true);
      const res = await api.updateProfile({
        id: currentUser?.id,
        name,
        email,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined
      });

      setName(res.name);
      setEmail(res.email);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: res }));

      setFeedback({
        type: 'success',
        message: 'Seus dados de acesso foram atualizados com sucesso!'
      });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível salvar as configurações.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (newUserPassword.length < 6) {
      setFeedback({ type: 'error', message: 'A senha do novo acesso deve conter no mínimo 6 caracteres.' });
      return;
    }

    try {
      setCreatingUser(true);
      await api.createUser({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole
      });

      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('Operador');

      setFeedback({
        type: 'success',
        message: `Novo acesso para "${newUserName}" criado com sucesso!`
      });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar novo acesso.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleDeleteUser(id: string, userName: string) {
    if (!window.confirm(`Tem certeza que deseja remover o acesso de "${userName}"?`)) {
      return;
    }
    setFeedback(null);
    try {
      await api.deleteUser(id);
      setFeedback({
        type: 'success',
        message: `Acesso de "${userName}" removido com sucesso.`
      });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover acesso.';
      setFeedback({ type: 'error', message: msg });
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: '#6b7280' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
        <p>Carregando configurações de acesso...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="section-head" style={{ marginBottom: '1.5rem' }}>
        <div>
          <span className="section-kicker">GESTÃO DE EQUIPE & ACESSOS</span>
          <h2>Acessos & Configurações</h2>
          <p>Crie novos acessos para sua equipe e gerencie credenciais, e-mails e senhas.</p>
        </div>
      </div>

      {feedback && (
        <div 
          className="notice" 
          style={{ 
            borderColor: feedback.type === 'success' ? '#10b981' : '#ef4444', 
            background: feedback.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          {feedback.type === 'success' ? (
            <Check style={{ color: '#10b981' }} size={20} />
          ) : (
            <AlertCircle style={{ color: '#ef4444' }} size={20} />
          )}
          <div>
            <b style={{ color: feedback.type === 'success' ? '#10b981' : '#ef4444' }}>
              {feedback.type === 'success' ? 'Sucesso!' : 'Atenção!'}
            </b>
            <p style={{ margin: 0 }}>{feedback.message}</p>
          </div>
        </div>
      )}

      {/* BLOCO 1: CRIAR NOVO ACESSO */}
      <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid #e0e7ff', background: '#fafbff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
          <UserPlus size={22} style={{ color: '#4f46e5' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e1b4b' }}>Criar Novo Acesso (Novo Usuário)</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Cadastre um membro da equipe para acessar o painel com seu próprio e-mail e senha.</p>
          </div>
        </div>

        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Nome Completo *
              </label>
              <input
                type="text"
                value={newUserName}
                onChange={e => setNewUserName(e.target.value)}
                required
                placeholder="Ex: João Silva"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  background: '#fff'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                E-mail de Login *
              </label>
              <input
                type="email"
                value={newUserEmail}
                onChange={e => setNewUserEmail(e.target.value)}
                required
                placeholder="joao@exemplo.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  background: '#fff'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Senha Inicial *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewUserPass ? 'text' : 'password'}
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  required
                  placeholder="Mínimo 6 dígitos"
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    background: '#fff'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewUserPass(!showNewUserPass)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9ca3af'
                  }}
                >
                  {showNewUserPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Função / Nível
              </label>
              <select
                value={newUserRole}
                onChange={e => setNewUserRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  background: '#fff'
                }}
              >
                <option value="Operador">Operador(a)</option>
                <option value="Gestor">Gestor(a)</option>
                <option value="Administrador">Administrador(a)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn primary"
              disabled={creatingUser}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '8px',
                background: '#4f46e5'
              }}
            >
              {creatingUser ? (
                <>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Criando acesso...
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Cadastrar Acesso
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* BLOCO 2: LISTA DE ACESSOS ATIVOS NO SISTEMA */}
      <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} style={{ color: '#2563eb' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Usuários com Acesso Ativo ({usersList.length})</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Pessoas que podem efetuar login nesta central de ofertas.</p>
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 12px' }}>Usuário</th>
                <th style={{ padding: '10px 12px' }}>E-mail de Login</th>
                <th style={{ padding: '10px 12px' }}>Função</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                        {u.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}
                      </div>
                      <b>{u.name}</b>
                    </div>
                  </td>
                  <td style={{ padding: '12px', color: '#4b5563' }}>{u.email}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', color: '#065f46', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500 }}>
                      <BadgeCheck size={13} /> {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {usersList.length > 1 && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="outline-btn"
                        style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '5px 10px', fontSize: '12px' }}
                        title="Remover acesso"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BLOCO 3: EDITAR MEUS DADOS E MINHA SENHA */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
            <User size={20} style={{ color: '#2563eb' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Editar Meu Acesso Atual ({name})</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Altere seu nome, seu e-mail ou troque sua senha atual.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Meu Nome Completo
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  background: '#fff'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Meu E-mail de Login
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  background: '#fff'
                }}
              />
            </div>
          </div>

          {/* Alterar Senha */}
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem', color: '#b45309', fontWeight: 600, fontSize: '14px' }}>
              <KeyRound size={16} /> Alterar Minha Senha (Opcional)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Senha Atual
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Digite a senha atual"
                    style={{
                      width: '100%',
                      padding: '10px 38px 10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      background: '#fff'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af'
                    }}
                  >
                    {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Nova Senha
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 dígitos"
                    style={{
                      width: '100%',
                      padding: '10px 38px 10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      background: '#fff'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af'
                    }}
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Confirmar Nova Senha
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    style={{
                      width: '100%',
                      padding: '10px 38px 10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      background: '#fff'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af'
                    }}
                  >
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {feedback && (
          <div
            role="alert"
            aria-live="polite"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 14px',
              borderRadius: '8px',
              border: `1px solid ${feedback.type === 'success' ? '#86efac' : '#fca5a5'}`,
              background: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: feedback.type === 'success' ? '#166534' : '#b91c1c',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            {feedback.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            {feedback.message}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="submit"
            className="btn primary"
            disabled={saving}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '8px'
            }}
          >
            {saving ? (
              <>
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Salvando alterações...
              </>
            ) : (
              <>
                <Save size={16} />
                Salvar Meus Dados
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
