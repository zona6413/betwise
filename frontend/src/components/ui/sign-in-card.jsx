import { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, BarChart2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = import.meta.env.VITE_API_URL ?? 'https://betwise-suh4.onrender.com';

/* ── Input field ── */
function FloatingInput({ icon: Icon, type, placeholder, value, onChange, onFocus, onBlur, focused, rightSlot, autoComplete, required = true }) {
  return (
    <div className="relative">
      <div className="relative flex items-center rounded-xl overflow-hidden">
        <Icon className={cn(
          'absolute left-3 w-4 h-4 transition-colors duration-200 pointer-events-none z-10',
          focused ? 'text-white' : 'text-white/40'
        )} />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          autoComplete={autoComplete}
          required={required}
          style={{
            background: focused ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
            border: focused ? '1px solid rgba(255,255,255,0.20)' : '1px solid rgba(255,255,255,0.10)',
            color: '#fff',
            height: '40px',
            width: '100%',
            borderRadius: '12px',
            outline: 'none',
            paddingLeft: '40px',
            paddingRight: rightSlot ? '40px' : '12px',
            fontSize: '14px',
            transition: 'all 0.2s ease',
          }}
          className="placeholder:text-white/25"
        />
        {rightSlot && (
          <div className="absolute right-3 z-10">{rightSlot}</div>
        )}
      </div>
    </div>
  );
}

/* ── Toggle œil ── */
function EyeToggle({ show, toggle }) {
  return (
    <button type="button" onClick={toggle}
      className="text-white/35 hover:text-white/65 transition-colors bg-transparent border-none cursor-pointer p-0">
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}

/* ── Bouton submit ── */
function SubmitBtn({ loading, label }) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      type="submit"
      disabled={loading}
      className="w-full mt-1 relative group"
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      <div style={{
        background: loading ? 'rgba(234,179,8,0.7)' : '#eab308',
        height: '40px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 500,
        color: '#fff',
        transition: 'background 0.2s ease',
        gap: '6px',
      }}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            </motion.div>
          ) : (
            <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5">
              {label}
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

/* ══════════════════════════════════════════════════════════
   Composant principal
══════════════════════════════════════════════════════════ */
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

  /* 3D tilt */
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-200, 200], [6, -6]);
  const rotateY = useTransform(mouseX, [-200, 200], [-6, 6]);

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

  /* ── Contenu selon le mode ── */
  function renderContent() {
    if (mode === 'forgot') return (
      <motion.div key="forgot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
        <button type="button" onClick={() => switchMode('login')}
          className="text-xs text-white/35 hover:text-white/60 mb-4 flex items-center gap-1 bg-transparent border-none cursor-pointer transition-colors p-0">
          ← Retour
        </button>
        <p className="text-white font-semibold text-base mb-1">Mot de passe oublié</p>
        <p className="text-white/40 text-xs mb-5">
          {forgotDone ? 'Vérifie ta boîte mail — le lien est valable 1h.' : 'Reçois un lien par email.'}
        </p>
        {!forgotDone ? (
          <form onSubmit={handleForgot} className="space-y-3">
            <FloatingInput icon={Mail} type="email" placeholder="Adresse email" value={email}
              onChange={e => setEmail(e.target.value)} focused={focused === 'email'}
              onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} autoComplete="email" />
            {shownError && <p className="text-red-400 text-xs">{shownError}</p>}
            <SubmitBtn loading={isLoading} label="Envoyer le lien" />
          </form>
        ) : (
          <div className="text-center py-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.25)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="text-white/55 text-sm">Envoyé à <span className="text-white">{email}</span></p>
            <button type="button" onClick={() => switchMode('login')}
              className="mt-4 text-xs text-green-400 hover:text-green-300 bg-transparent border-none cursor-pointer transition-colors">
              Retour à la connexion
            </button>
          </div>
        )}
      </motion.div>
    );

    if (mode === 'reset') return (
      <motion.div key="reset" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
        <p className="text-white font-semibold text-base mb-1">Nouveau mot de passe</p>
        <p className="text-white/40 text-xs mb-5">
          {resetDone ? 'Mis à jour — connexion en cours...' : 'Choisis un nouveau mot de passe.'}
        </p>
        {!resetDone ? (
          <form onSubmit={handleReset} className="space-y-3">
            <FloatingInput icon={Lock} type={showPwd ? 'text' : 'password'} placeholder="Nouveau mot de passe"
              value={password} onChange={e => setPassword(e.target.value)}
              focused={focused === 'pwd'} onFocus={() => setFocused('pwd')} onBlur={() => setFocused(null)}
              autoComplete="new-password" rightSlot={<EyeToggle show={showPwd} toggle={() => setShowPwd(v => !v)} />} />
            <FloatingInput icon={Lock} type={showCfm ? 'text' : 'password'} placeholder="Confirmer"
              value={confirm} onChange={e => setConfirm(e.target.value)}
              focused={focused === 'cfm'} onFocus={() => setFocused('cfm')} onBlur={() => setFocused(null)}
              autoComplete="new-password" rightSlot={<EyeToggle show={showCfm} toggle={() => setShowCfm(v => !v)} />} />
            {shownError && <p className="text-red-400 text-xs">{shownError}</p>}
            <SubmitBtn loading={isLoading} label="Changer le mot de passe" />
          </form>
        ) : (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-green-400/60 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </motion.div>
    );

    /* Login / Register */
    return (
      <motion.div key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
        <p className="text-white font-semibold text-base mb-1">
          {mode === 'login' ? 'Bienvenue' : 'Créer un compte'}
        </p>
        <p className="text-white/40 text-xs mb-5">
          {mode === 'login' ? 'Connecte-toi pour accéder à tes analyses' : 'Synchronise tes paris sur tous tes appareils'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <FloatingInput icon={User} type="text" placeholder="Pseudo (optionnel)" value={username}
              onChange={e => setUsername(e.target.value)} focused={focused === 'user'}
              onFocus={() => setFocused('user')} onBlur={() => setFocused(null)}
              autoComplete="username" required={false} />
          )}
          <FloatingInput icon={Mail} type="email" placeholder="Adresse email" value={email}
            onChange={e => setEmail(e.target.value)} focused={focused === 'email'}
            onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} autoComplete="email" />
          <FloatingInput icon={Lock} type={showPwd ? 'text' : 'password'} placeholder="Mot de passe"
            value={password} onChange={e => setPassword(e.target.value)}
            focused={focused === 'pwd'} onFocus={() => setFocused('pwd')} onBlur={() => setFocused(null)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            rightSlot={<EyeToggle show={showPwd} toggle={() => setShowPwd(v => !v)} />} />

          {mode === 'login' && (
            <div className="flex justify-end">
              <button type="button" onClick={() => switchMode('forgot')}
                className="text-xs text-white/35 hover:text-white/60 bg-transparent border-none cursor-pointer transition-colors p-0">
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {shownError && <p className="text-red-400 text-xs">{shownError}</p>}
          <SubmitBtn loading={isLoading} label={mode === 'login' ? 'Se connecter' : "Créer mon compte"} />
        </form>

        <div className="relative my-4 flex items-center">
          <div className="flex-grow" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
          <span className="mx-3 text-xs text-white/25">ou</span>
          <div className="flex-grow" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
        </div>

        <div className="text-center space-y-2.5">
          <p className="text-xs text-white/35">
            {mode === 'login' ? "Pas encore de compte ? " : "Déjà un compte ? "}
            <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="text-green-400 hover:text-green-300 font-medium bg-transparent border-none cursor-pointer transition-colors">
              {mode === 'login' ? "S'inscrire" : 'Se connecter'}
            </button>
          </p>
          <button type="button" onClick={onClose}
            className="text-xs text-white/25 hover:text-white/45 bg-transparent border-none cursor-pointer transition-colors">
            Continuer sans compte
          </button>
        </div>
      </motion.div>
    );
  }

  /* ── Render principal ── */
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      {/* Overlay sombre — cliquable pour fermer */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}
        onClick={onClose} />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '360px', perspective: '1200px' }}
      >
        <motion.div style={{ rotateX, rotateY }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
          <div style={{ position: 'relative' }}>

            {/* Light beams */}
            <div style={{ position: 'absolute', inset: '-1px', borderRadius: '18px', overflow: 'hidden', pointerEvents: 'none' }}>
              {/* Top */}
              <motion.div style={{ position: 'absolute', top: 0, height: '1px', width: '45%', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.5), transparent)', opacity: 0.6 }}
                animate={{ left: ['-45%', '100%'] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }} />
              {/* Right */}
              <motion.div style={{ position: 'absolute', right: 0, width: '1px', height: '45%', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.5), transparent)', opacity: 0.6 }}
                animate={{ top: ['-45%', '100%'] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut', delay: 0.65 }} />
              {/* Bottom */}
              <motion.div style={{ position: 'absolute', bottom: 0, height: '1px', width: '45%', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.5), transparent)', opacity: 0.6 }}
                animate={{ right: ['-45%', '100%'] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut', delay: 1.3 }} />
              {/* Left */}
              <motion.div style={{ position: 'absolute', left: 0, width: '1px', height: '45%', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.5), transparent)', opacity: 0.6 }}
                animate={{ bottom: ['-45%', '100%'] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut', delay: 1.95 }} />
            </div>

            {/* Glass card */}
            <div style={{
              background: 'rgba(8,8,20,0.90)',
              backdropFilter: 'blur(28px)',
              borderRadius: '18px',
              border: '1px solid rgba(255,255,255,0.09)',
              padding: '24px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
              position: 'relative',
              overflow: 'hidden',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}>

              {/* Close */}
              <button onClick={onClose} type="button" style={{
                position: 'absolute', top: '14px', right: '14px',
                width: '26px', height: '26px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.35)', cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}>
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Logo */}
              <motion.div className="flex items-center gap-2 mb-5"
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BarChart2 className="w-4 h-4 text-white" />
                </div>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px', letterSpacing: '-0.3px' }}>DoddBet</span>
              </motion.div>

              {/* Contenu dynamique */}
              <AnimatePresence mode="wait">
                {renderContent()}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
