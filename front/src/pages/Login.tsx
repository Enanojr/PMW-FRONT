import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const usuario = await login(username.trim(), password);
      const desde = (location.state as { desde?: string } | null)?.desde;
      navigate(desde ?? (usuario.rol === 'ADMIN' ? '/' : '/calendario'), { replace: true });
    } catch {
      setError('Credenciales inválidas. Verifica tu usuario y contraseña.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-smoke p-6">
      <div className="w-full max-w-sm animate-fade-up">
        {/* Marca */}
        <div className="mb-10 text-center">
          <p className="text-2xl font-semibold tracking-tight text-ink">
            KYOCERA<span className="text-kyocera-500">.</span>
          </p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-silver">
            Plataforma de mantenimiento
          </p>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-semibold tracking-tight text-ink">Inicia sesión</h1>
          <p className="mt-1 text-sm text-silver">Accede con tu cuenta asignada</p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="username" className="label-field">Usuario</label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="password" className="label-field">Contraseña</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-kyocera-50 px-3.5 py-2.5 text-[13px] text-kyocera-700">
                {error}
              </p>
            )}

            <button type="submit" disabled={enviando} className="btn-primary w-full">
              {enviando ? 'Ingresando…' : 'Continuar'}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-[11px] text-silver">
          Acceso restringido · Administradores y técnicos autorizados
        </p>
      </div>
    </div>
  );
}
