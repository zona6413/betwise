/**
 * emailService.js — Envoi d'emails transactionnels via Resend
 * Fallback console si RESEND_API_KEY absent (dev local)
 */
import { Resend } from 'resend';

const RESEND_KEY  = process.env.RESEND_API_KEY?.trim() ?? null;
const FROM_EMAIL  = process.env.FROM_EMAIL?.trim()    ?? 'DoddBet <noreply@doddbet.com>';
const APP_URL     = process.env.FRONTEND_URL?.trim()  ?? 'https://doddbet.com';

const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

async function send({ to, subject, html }) {
  if (!resend) {
    console.log(`[email] (no RESEND_API_KEY — dev mode)\n  TO: ${to}\n  SUBJECT: ${subject}`);
    return { ok: true, dev: true };
  }
  try {
    const { data, error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    if (error) throw new Error(error.message ?? JSON.stringify(error));
    console.log(`[email] Sent "${subject}" → ${to} (id: ${data?.id})`);
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error(`[email] Failed to send "${subject}" → ${to}:`, err.message);
    return { ok: false, error: err.message };
  }
}

/* ─────────────────────────────────────────────────────────────
   Layout de base — dark theme DoddBet gold
───────────────────────────────────────────────────────────── */
function baseLayout(content) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DoddBet</title>
</head>
<body style="margin:0;padding:0;background:#05070B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#05070B;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;">

        <!-- Logo -->
        <tr><td style="padding-bottom:28px;text-align:center;">
          <div style="display:inline-block;background:linear-gradient(135deg,#b45309,#eab308);border-radius:12px;width:44px;height:44px;line-height:44px;text-align:center;font-size:20px;">⚽</div>
          <span style="display:block;margin-top:8px;font-size:13px;font-weight:700;color:rgba(240,242,248,0.4);letter-spacing:1px;text-transform:uppercase;">DoddBet</span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#0C0F18;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:36px 32px;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;font-size:11px;color:rgba(255,255,255,0.2);line-height:1.6;">
          DoddBet · Outil d'analyse statistique à titre informatif uniquement<br/>
          18+ · Jeu responsable · <a href="tel:0974751313" style="color:rgba(255,255,255,0.3);">09 74 75 13 13</a><br/>
          <a href="${APP_URL}/legal" style="color:rgba(255,255,255,0.2);">Mentions légales</a> · <a href="${APP_URL}" style="color:rgba(255,255,255,0.2);">doddbet.com</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ─────────────────────────────────────────────────────────────
   Bienvenue à l'inscription
───────────────────────────────────────────────────────────── */
export async function sendWelcomeEmail({ to, username }) {
  const name = username || to.split('@')[0];
  const html = baseLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#f0f2f8;letter-spacing:-0.5px;">Bienvenue sur DoddBet ⚽</h1>
    <p style="margin:0 0 24px;font-size:13px;color:rgba(240,242,248,0.4);">Compte créé avec succès</p>

    <p style="font-size:15px;line-height:1.65;color:rgba(240,242,248,0.72);margin:0 0 20px;">
      Bonjour <strong style="color:#f0f2f8;">${name}</strong>,<br/>
      ton compte DoddBet est prêt. Analyse les matchs du jour et accède aux picks sélectionnés par l'IA.
    </p>

    <div style="background:rgba(234,179,8,0.07);border:1px solid rgba(234,179,8,0.18);border-radius:12px;padding:18px 20px;margin:0 0 24px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:rgba(234,179,8,0.7);text-transform:uppercase;letter-spacing:0.6px;">Inclus en compte gratuit</p>
      <p style="margin:0;font-size:13.5px;color:rgba(240,242,248,0.65);line-height:1.6;">
        ✅ 3 picks du jour sélectionnés par l'IA<br/>
        ✅ Coupe du Monde 2026 · Ligues pro<br/>
        ✅ Analyses statistiques de base
      </p>
    </div>

    <div style="background:rgba(234,179,8,0.04);border:1px solid rgba(234,179,8,0.10);border-radius:12px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:rgba(240,242,248,0.4);text-transform:uppercase;letter-spacing:0.5px;">Passe Pro pour débloquer</p>
      <p style="margin:0;font-size:13px;color:rgba(240,242,248,0.5);line-height:1.6;">
        🔓 Tous les matchs · Value bets · Générateur de combos · Suivi de paris
      </p>
    </div>

    <a href="${APP_URL}" style="display:block;background:linear-gradient(135deg,#b45309,#eab308);color:#fff;text-align:center;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.2px;">
      Accéder à DoddBet →
    </a>
  `);
  return send({ to, subject: 'Bienvenue sur DoddBet ⚽', html });
}

/* ─────────────────────────────────────────────────────────────
   Réinitialisation du mot de passe
───────────────────────────────────────────────────────────── */
export async function sendResetEmail({ to, resetUrl }) {
  const html = baseLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#f0f2f8;letter-spacing:-0.5px;">Réinitialisation du mot de passe</h1>
    <p style="margin:0 0 24px;font-size:13px;color:rgba(240,242,248,0.4);">Lien valide pendant 1 heure</p>

    <p style="font-size:14px;line-height:1.65;color:rgba(240,242,248,0.7);margin:0 0 24px;">
      Une demande de réinitialisation a été effectuée pour ce compte DoddBet.<br/>
      Si tu n'es pas à l'origine de cette demande, ignore simplement cet email.
    </p>

    <a href="${resetUrl}" style="display:block;background:linear-gradient(135deg,#b45309,#eab308);color:#fff;text-align:center;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.2px;margin:0 0 20px;">
      Changer mon mot de passe →
    </a>

    <p style="font-size:12px;color:rgba(240,242,248,0.3);margin:0;line-height:1.5;">
      Ou copie ce lien dans ton navigateur :<br/>
      <span style="color:rgba(234,179,8,0.5);word-break:break-all;">${resetUrl}</span>
    </p>
  `);
  return send({ to, subject: 'Réinitialisation de ton mot de passe DoddBet', html });
}

/* ─────────────────────────────────────────────────────────────
   Reçu paiement Stripe
───────────────────────────────────────────────────────────── */
export async function sendReceiptEmail({ to, username, plan, amount, date }) {
  const name    = username || to.split('@')[0];
  const planLbl = plan === 'yearly' ? 'Pro Annuel' : 'Pro Mensuel';
  const amtFmt  = `${(amount / 100).toFixed(2)} €`;
  const dateFmt = new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = baseLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#f0f2f8;letter-spacing:-0.5px;">Paiement confirmé ✅</h1>
    <p style="margin:0 0 24px;font-size:13px;color:rgba(240,242,248,0.4);">Merci pour ton abonnement DoddBet</p>

    <p style="font-size:14px;line-height:1.65;color:rgba(240,242,248,0.7);margin:0 0 20px;">
      Bonjour <strong style="color:#f0f2f8;">${name}</strong>, ton abonnement <strong style="color:#eab308;">${planLbl}</strong> est actif. Tu as maintenant accès à toutes les fonctionnalités Pro.
    </p>

    <div style="background:rgba(234,179,8,0.07);border:1px solid rgba(234,179,8,0.20);border-radius:12px;padding:20px;margin:0 0 20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:rgba(240,242,248,0.45);padding-bottom:12px;">Plan</td>
          <td style="font-size:13px;color:#f0f2f8;text-align:right;font-weight:700;padding-bottom:12px;">${planLbl}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:rgba(240,242,248,0.45);padding-bottom:12px;">Montant</td>
          <td style="font-size:13px;color:#eab308;text-align:right;font-weight:800;padding-bottom:12px;">${amtFmt}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:rgba(240,242,248,0.45);">Date</td>
          <td style="font-size:13px;color:#f0f2f8;text-align:right;font-weight:700;">${dateFmt}</td>
        </tr>
      </table>
    </div>

    <div style="background:rgba(234,179,8,0.04);border:1px solid rgba(234,179,8,0.10);border-radius:12px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0;font-size:13px;color:rgba(240,242,248,0.55);line-height:1.6;">
        🔓 Tous les matchs & ligues débloqués<br/>
        🎯 Value bets · Générateur de combos<br/>
        📊 Analyses IA illimitées · Suivi de paris
      </p>
    </div>

    <a href="${APP_URL}" style="display:block;background:linear-gradient(135deg,#b45309,#eab308);color:#fff;text-align:center;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.2px;">
      Accéder à DoddBet Pro →
    </a>
  `);
  return send({ to, subject: `✅ Abonnement DoddBet ${planLbl} activé`, html });
}
