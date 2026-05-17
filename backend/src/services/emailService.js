/**
 * emailService.js — Envoi d'emails transactionnels via Resend
 * Fallback console si RESEND_API_KEY absent (dev local)
 */
import { Resend } from 'resend';

const RESEND_KEY  = process.env.RESEND_API_KEY?.trim() ?? null;
const FROM_EMAIL  = process.env.FROM_EMAIL?.trim()    ?? 'BetWise <noreply@betwise.app>';
const APP_URL     = process.env.FRONTEND_URL?.trim()  ?? 'https://betwise.netlify.app';

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
   Templates
───────────────────────────────────────────────────────────── */

function baseLayout(content) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BetWise</title>
</head>
<body style="margin:0;padding:0;background:#0b0d12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0d12;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;">

        <!-- Logo -->
        <tr><td style="padding-bottom:28px;text-align:center;">
          <div style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;width:44px;height:44px;line-height:44px;text-align:center;font-size:18px;font-weight:900;color:#fff;letter-spacing:-0.5px;">BW</div>
          <span style="display:block;margin-top:8px;font-size:13px;font-weight:700;color:rgba(240,242,248,0.5);letter-spacing:0.3px;">BETWISE</span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#111318;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:36px 32px;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;font-size:11px;color:rgba(255,255,255,0.2);line-height:1.6;">
          BetWise · Outil d'analyse statistique à titre informatif uniquement<br/>
          18+ · Jeu responsable · <a href="tel:0974751313" style="color:rgba(255,255,255,0.3);">09 74 75 13 13</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* Bienvenue à l'inscription */
export async function sendWelcomeEmail({ to, username }) {
  const name = username || to.split('@')[0];
  const html = baseLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#f0f2f8;letter-spacing:-0.5px;">Bienvenue sur BetWise</h1>
    <p style="margin:0 0 20px;font-size:13px;color:rgba(240,242,248,0.45);">Compte créé avec succès</p>

    <p style="font-size:15px;line-height:1.6;color:rgba(240,242,248,0.75);margin:0 0 16px;">
      Bonjour <strong style="color:#f0f2f8;">${name}</strong>,<br/>
      ton compte BetWise est prêt. Accède à l'analyse statistique de plus de 500 matchs par semaine.
    </p>

    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:18px 20px;margin:0 0 24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:rgba(240,242,248,0.5);text-transform:uppercase;letter-spacing:0.5px;">Inclus en compte gratuit</p>
      <p style="margin:0;font-size:13.5px;color:rgba(240,242,248,0.7);line-height:1.6;">Matchs du jour · Coupe du Monde 2026 · Coupes nationales · Analyses IA</p>
    </div>

    <a href="${APP_URL}" style="display:block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-align:center;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.2px;">
      Accéder à BetWise
    </a>
  `);
  return send({ to, subject: 'Bienvenue sur BetWise', html });
}

/* Réinitialisation du mot de passe */
export async function sendResetEmail({ to, resetUrl }) {
  const html = baseLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#f0f2f8;letter-spacing:-0.5px;">Réinitialisation du mot de passe</h1>
    <p style="margin:0 0 24px;font-size:13px;color:rgba(240,242,248,0.45);">Valide pendant 1 heure</p>

    <p style="font-size:14px;line-height:1.65;color:rgba(240,242,248,0.7);margin:0 0 24px;">
      Une demande de réinitialisation de mot de passe a été effectuée pour ce compte.<br/>
      Si tu n'es pas à l'origine de cette demande, ignore cet email.
    </p>

    <a href="${resetUrl}" style="display:block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-align:center;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.2px;margin:0 0 20px;">
      Changer mon mot de passe
    </a>

    <p style="font-size:12px;color:rgba(240,242,248,0.35);margin:0;line-height:1.5;">
      Ou copie ce lien dans ton navigateur :<br/>
      <span style="color:rgba(165,180,252,0.6);word-break:break-all;">${resetUrl}</span>
    </p>
  `);
  return send({ to, subject: 'Réinitialisation de votre mot de passe BetWise', html });
}

/* Reçu paiement Stripe */
export async function sendReceiptEmail({ to, username, plan, amount, date }) {
  const name    = username || to.split('@')[0];
  const planLbl = plan === 'yearly' ? 'Pro Annuel' : 'Pro Mensuel';
  const amtFmt  = `${(amount / 100).toFixed(2)} €`;
  const dateFmt = new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = baseLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#f0f2f8;letter-spacing:-0.5px;">Paiement reçu</h1>
    <p style="margin:0 0 24px;font-size:13px;color:rgba(240,242,248,0.45);">Merci pour ton abonnement</p>

    <p style="font-size:14px;line-height:1.65;color:rgba(240,242,248,0.7);margin:0 0 20px;">
      Bonjour <strong style="color:#f0f2f8;">${name}</strong>, ton abonnement <strong style="color:#a5b4fc;">${planLbl}</strong> est actif.
    </p>

    <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:20px;margin:0 0 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:rgba(240,242,248,0.5);padding-bottom:10px;">Plan</td>
          <td style="font-size:13px;color:#f0f2f8;text-align:right;font-weight:700;padding-bottom:10px;">${planLbl}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:rgba(240,242,248,0.5);padding-bottom:10px;">Montant</td>
          <td style="font-size:13px;color:#f0f2f8;text-align:right;font-weight:700;padding-bottom:10px;">${amtFmt}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:rgba(240,242,248,0.5);">Date</td>
          <td style="font-size:13px;color:#f0f2f8;text-align:right;font-weight:700;">${dateFmt}</td>
        </tr>
      </table>
    </div>

    <a href="${APP_URL}" style="display:block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-align:center;padding:14px 24px;border-radius:12px;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.2px;">
      Accéder à BetWise Pro
    </a>
  `);
  return send({ to, subject: `Reçu · Abonnement BetWise ${planLbl}`, html });
}
