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
  Lock,
  BadgeCheck
} from 'lucide-react';
import { api } from '../lib/api';

export function SettingsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Administradora');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await api.getProfile();
        setName(data.name || '');
        setEmail(data.email || '');
        setRole(data.role || 'Administradora');
      } catch (err: unknown) {
        console.error('Falha ao carregar perfil:', err);
        // Fallback para os valores locais conhecidos
        setName('Marina Costa');
        setEmail('admin@centralofertas.local');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);

    // Validação de senhas se preenchido
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

      // Dispara evento para atualizar o nome no AdminLayout em tempo real
      window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: res }));

      setFeedback({
        type: 'success',
        message: 'Acessos e dados atualizados com sucesso! Utilize o novo e-mail/senha no próximo login.'
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível salvar as configurações.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
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
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="section-head" style={{ marginBottom: '1.5rem' }}>
        <div>
          <span className="section-kicker">SEGURANÇA & ACESSOS</span>
          <h2>Configurações de Acesso</h2>
          <p>Altere o nome do operador, e-mail de acesso e credenciais de senha da sua central.</p>
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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Bloco 1: Dados do Usuário / Perfil */}
        <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
            <User size={20} style={{ color: '#2563eb' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Dados Pessoais & Identificação</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Como você é identificada nos relatórios e no cabeçalho do sistema.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Nome Completo
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="Ex: Karen Silva"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    outline: 'none',
                    background: '#fff'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Nível de Acesso (Cargo)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={role}
                  disabled
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                    background: '#f9fafb',
                    color: '#6b7280',
                    cursor: 'not-allowed'
                  }}
                />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                  <BadgeCheck size={14} /> Ativo
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 2: E-mail de Login */}
        <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
            <Mail size={20} style={{ color: '#3b82f6' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>E-mail de Acesso (Login)</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Este é o endereço utilizado na tela de login para acessar a área administrativa.</p>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
              E-mail de Login
            </label>
            <div style={{ maxWidth: '500px' }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seuemail@exemplo.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#fff'
                }}
              />
            </div>
            <small style={{ display: 'block', marginTop: '6px', color: '#6b7280', fontSize: '12px' }}>
              💡 Dica: Ao alterar este e-mail, utilize-o em seus próximos logins na página inicial do painel.
            </small>
          </div>
        </div>

        {/* Bloco 3: Troca de Senha */}
        <div className="panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
            <KeyRound size={20} style={{ color: '#f59e0b' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Segurança e Senha de Acesso</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Deixe os campos em branco se não quiser alterar sua senha agora.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Senha Atual
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Digite a senha atual"
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    outline: 'none',
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
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    outline: 'none',
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
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  style={{
                    width: '100%',
                    padding: '10px 38px 10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    outline: 'none',
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

        {/* Botão de salvar */}
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
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
