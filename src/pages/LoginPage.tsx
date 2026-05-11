import { useState } from 'react';
import { Lock, LogIn } from 'lucide-react';
import { useAuth } from '../auth';

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-mpl-black flex items-center justify-center px-5">
      <form onSubmit={handleSubmit} className="w-full max-w-sm mpl-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gold-gradient flex items-center justify-center">
            <Lock size={18} className="text-mpl-black" />
          </div>
          <div>
            <p className="text-white font-black text-sm tracking-wide">MPL Admin</p>
            <p className="text-xs text-mpl-gold uppercase tracking-widest font-semibold">Supabase Login</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <div>
          <label className="section-title">Email</label>
          <input
            className="input-field"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="section-title">Password</label>
          <input
            className="input-field"
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button className="btn-gold w-full flex items-center justify-center gap-2" type="submit" disabled={isSubmitting}>
          <LogIn size={14} />
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
