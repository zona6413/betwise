'use client'
import { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, BarChart2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.VITE_API_URL ?? '';

function FloatingInput({ icon: Icon, type, placeholder, value, onChange, onFocus, onBlur, focused, rightSlot, autoComplete }) {
  return (
    <div className={cn('relative transition-all duration-200', focused && 'z-10')}>
      <div className="relative flex items-center overflow-hidden rounded-xl">
        <Icon className={cn(
          'absolute left-3 w-4 h-4 transition-colors duration-200 flex-shrink-0',
          focused ? 'text-white' : 'text-white/35'
        )} />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          autoComplete={autoComplete}
          required
          className={cn(
            'w-full bg-white/5 border border-white/8 text-white placeholder:text-white/25 h-10',
            'text-sm rounded-xl transition-all duration-200 outline-none pl-10',
            rightSlot ? 'pr-10' : 'pr-3',
            focused && 'bg-white/8 border-white/18'
          )}
        />
        {rightSlot && (
          <div className="absolute right-3">{rightSlot}</div>
        )}
      </div>
    </div>
  );
}

export default function SignInCard({ onLogin, onRegister, onClose, loading, error, setError, resetToken = null }) {
  const [mode, setMode] = useState(resetToken ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [username, setUsername] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showCfm, setShowCfm] = useState(false);
  const [focused, setFocused] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [forgotDone, setForgotDone] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // 3D tilt effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-250, 250], [8, -8]);
  const rotateY = useTransform(mouseX, [-250, 250], [-8, 8]);

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }
  function handleMouseLeave() { mouseX.set(0); mouseY.set(0); }

  function switchMode(m) {
    setMode(m); setLocalError(''); setError?.(null); setForgotDone(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (mode === 'login') await onLogin(email, password);
    else if (mode === 'register') await onRegister(email, password, username);
  }

  async function handleForgot(e) {
    e.preventDefault();
    setLocalError(''); setLocalLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur');
      setForgotDone(true);
    } catch (err) { setLocalError(err.message); }
    finally { setLocalLoading(false); }
  }

  async function handleReset(e) {
    e.preventDefault();
    setLocalError('');
    if (password !== confirm) { setLocalError('Les mots de passe ne correspondent pas'); return; }
    if (password.length < 6) { setLocalError('Minimum 6 caractères'); return; }
    setLocalLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Lien invalide ou expiré');
      setResetDone(true);
      if (data.token) setTimeout(() => { onLogin?.(null, null, data); }, 1800);
    } catch (err) { setLocalError(err.message); }
    finally { setLocalLoading(false); }
  }

  const isLoading = loading || localLoading;
  const shownError = localError || error;

  // ── Contenu du formulaire selon le mode ──
  function renderForm() {
    if (mode === 'forgot') {
      return (
        <AnimatePresence mode="wait">
          <motion.div key="forgot" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <button onClick={() => switchMode('login')} className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 mb-4 transition-colors bg-transparent border-none cursor-pointer">
              ← Retour
            </button>
            <h2 className="text-lg font-semibold text-white mb-1">Mot de passe oublié</h2>
            <p className="text-white/45 text-xs mb-5">
              {forgotDone ? 'Vérifie ta boîte mail — le lien est valable 1h.' : 'Reçois un lien de réinitialisation par email.'}
            </p>
            {!forgotDone ? (
              <form onSubmit={handleForgot} className="space-y-3">
                <FloatingInput icon={Mail} type="email" placeholder="Adresse email" value={email}
                  onChange={e => setEmail(e.target.value)} focused={focused === 'email'}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} autoComplete="email" />
                {shownError && <p className="text-red-400/90 text-xs">{shownError}</p>}
                <SubmitBtn loading={isLoading} label="Envoyer le lien" />
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full bg-violet-500/15 border border-violet-500/25 flex items-center justify-center mx-auto mb-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-white/60 text-sm">Email envoyé à <span className="text-white">{email}</span></p>
                <button onClick={() => switchMode('login')} className="mt-4 text-xs text-violet-400 hover:text-violet-300 bg-transparent border-none cursor-pointer transition-colors">Retour à la connexion</button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      );
    }

    if (mode === 'reset') {
      return (
        <AnimatePresence mode="wait">
          <motion.div key="reset" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <h2 className="text-lg font-semibold text-white mb-1">Nouveau mot de passe</h2>
            <p className="text-white/45 text-xs mb-5">
              {resetDone ? 'Mot de passe mis à jour — connexion en cours...' : 'Choisis un nouveau mot de passe.'}
            </p>
            {!resetDone ? (
              <form onSubmit={handleReset} className="space-y-3">
                <FloatingInput icon={Lock} type={showPwd ? 'text' : 'password'} placeholder="Nouveau mot de passe"
                  value={password} onChange={e => setPassword(e.target.value)}
                  focused={focused === 'pwd'} onFocus={() => setFocused('pwd')} onBlur={() => setFocused(null)}
                  autoComplete="new-password"
                  rightSlot={<EyeToggle show={showPwd} toggle={() => setShowPwd(v => !v)} />} />
                <FloatingInput icon={Lock} type={showCfm ? 'text' : 'password'} placeholder="Confirmer le mot de passe"
                  value={confirm} onChange={e => setConfirm(e.target.value)}
                  focused={focused === 'cfm'} onFocus={() => setFocused('cfm')} onBlur={() => setFocused(null)}
                  autoComplete="new-password"
                  rightSlot={<EyeToggle show={showCfm} toggle={() => setShowCfm(v => !v)} />} />
                {shownError && <p className="text-red-400/90 text-xs">{shownError}</p>}
                <SubmitBtn loading={isLoading} label="Changer le mot de passe" />
              </form>
            ) : (
              <div className="flex items-center justify-center py-6">
                <div className="w-5 h-5 border-2 border-violet-400/60 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      );
    }

    // Login / Register
    return (
      <AnimatePresence mode="wait">
        <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
          <h2 className="text-lg font-semibold text-white mb-1">
            {mode === 'login' ? 'Bienvenue' : 'Créer un compte'}
          </h2>
          <p className="text-white/45 text-xs mb-5">
            {mode === 'login' ? 'Connecte-toi pour accéder à tes analyses' : 'Synchronise tes paris sur tous tes appareils'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <FloatingInput icon={User} type="text" placeholder="Pseudo (optionnel)" value={username}
                onChange={e => setUsername(e.target.value)} focused={focused === 'user'}
                onFocus={() => setFocused('user')} onBlur={() => setFocused(null)} autoComplete="username" />
            )}
            <FloatingInput icon={Mail} type="email" placeholder="Adresse email" value={email}
              onChange={e => setEmail(e.target.value)} focused={focused === 'email'}
              onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} autoComplete="email" />
            <div className="relative">
              <FloatingInput icon={Lock} type={showPwd ? 'text' : 'password'} placeholder="Mot de passe"
                value={password} onChange={e => setPassword(e.target.value)}
                focused={focused === 'pwd'} onFocus={() => setFocused('pwd')} onBlur={() => setFocused(null)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                rightSlot={<EyeToggle show={showPwd} toggle={() => setShowPwd(v => !v)} />} />
            </div>

            {mode === 'login' && (
              <div className="flex justify-end">
                <button type="button" onClick={() => switchMode('forgot')}
                  className="text-xs text-white/35 hover:text-white/60 bg-transparent border-none cursor-pointer transition-colors">
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            {shownError && <p className="text-red-400/90 text-xs">{shownError}</p>}

            <SubmitBtn loading={isLoading} label={mode === 'login' ? 'Se connecter' : 'Créer mon compte'} />
          </form>

          <div className="relative my-4 flex items-center">
            <div className="flex-grow border-t border-white/6" />
            <span className="mx-3 text-xs text-white/30">ou</span>
            <div className="flex-grow border-t border-white/6" />
          </div>

          <div className="text-center space-y-2">
            <p className="text-xs text-white/35">
              {mode === 'login' ? "Pas encore de compte ? " : "Déjà un compte ? "}
              <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                className="text-violet-400 hover:text-violet-300 font-medium bg-transparent border-none cursor-pointer transition-colors">
                {mode === 'login' ? "S'inscrire" : 'Se connecter'}
              </button>
            </p>
            <button onClick={onClose} className="text-xs text-white/20 hover:text-white/40 bg-transparent border-none cursor-pointer transition-colors">
              Continuer sans compte
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 bg-gradient-to-b from-violet-600/25 via-violet-800/30 to-black/80 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] rounded-b-[50%] bg-violet-500/12 blur-[80px] pointer-events-none" />
      <motion.div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60vw] h-[50vh] rounded-t-full bg-violet-400/12 blur-[60px] pointer-events-none"
        animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.08, 1] }}
        transition={{ duration: 6, repeat: Infinity, repeatType: 'mirror' }} />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-full max-w-sm mx-4"
        style={{ perspective: 1200 }}
      >
        <motion.div style={{ rotateX, rotateY }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
          <div className="relative group">

            {/* Traveling light beams */}
            <div className="absolute -inset-px rounded-2xl overflow-hidden pointer-events-none">
              {[
                { axis: 'left', from: '-50%', to: '100%', className: 'top-0 left-0 h-px w-1/2 bg-gradient-to-r from-transparent via-white to-transparent' },
                { axis: 'top', from: '-50%', to: '100%', delay: 0.6, className: 'top-0 right-0 w-px h-1/2 bg-gradient-to-b from-transparent via-white to-transparent' },
                { axis: 'right', from: '-50%', to: '100%', delay: 1.2, className: 'bottom-0 right-0 h-px w-1/2 bg-gradient-to-r from-transparent via-white to-transparent' },
                { axis: 'bottom', from: '-50%', to: '100%', delay: 1.8, className: 'bottom-0 left-0 w-px h-1/2 bg-gradient-to-b from-transparent via-white to-transparent' },
              ].map((beam, i) => (
                <motion.div key={i} className={cn('absolute opacity-50', beam.className)}
                  animate={{ [beam.axis]: [beam.from, beam.to] }}
                  transition={{ duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: beam.delay ?? 0 }} />
              ))}
            </div>

            {/* Glass card */}
            <div className="relative bg-black/50 backdrop-blur-2xl rounded-2xl p-6 border border-white/[0.06] shadow-2xl overflow-hidden">
              {/* Close button */}
              <button onClick={onClose}
                className="absolute top-4 right-4 w-6 h-6 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/8 transition-all cursor-pointer">
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Logo */}
              <motion.div className="flex items-center gap-2 mb-5"
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center flex-shrink-0">
                  <BarChart2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-semibold text-sm tracking-tight">BetWise</span>
              </motion.div>

              {/* Contenu dynamique */}
              {renderForm()}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ── Bouton submit animé ──
function SubmitBtn({ loading, label }) {
  return (
    <motion.button
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      type="submit"
      disabled={loading}
      className="w-full relative mt-1"
    >
      <div className="absolute inset-0 bg-violet-500/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative overflow-hidden bg-violet-500 hover:bg-violet-400 text-white font-medium h-10 rounded-xl transition-colors duration-200 flex items-center justify-center text-sm">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            </motion.div>
          ) : (
            <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5">
              {label}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

// ── Toggle mot de passe ──
function EyeToggle({ show, toggle }) {
  return (
    <button type="button" onClick={toggle}
      className="text-white/30 hover:text-white/60 transition-colors bg-transparent border-none cursor-pointer">
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}
