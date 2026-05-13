import { Router }      from 'express';
import Stripe           from 'stripe';
import User             from '../models/User.js';
import { requireAuth }  from '../middleware/auth.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = Router();

// ── Prix Stripe (à créer dans le dashboard Stripe puis coller les IDs ici via env)
const PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY; // ex: price_xxx
const PRICE_YEARLY  = process.env.STRIPE_PRICE_YEARLY;  // ex: price_xxx
const FRONTEND_URL  = process.env.FRONTEND_URL || 'https://betwise.vercel.app';

// POST /api/stripe/create-checkout  →  crée une session Stripe Checkout
router.post('/create-checkout', requireAuth, async (req, res) => {
  try {
    const { plan } = req.body; // 'monthly' | 'yearly'
    const priceId  = plan === 'yearly' ? PRICE_YEARLY : PRICE_MONTHLY;
    if (!priceId) return res.status(400).json({ error: 'Plan invalide' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${FRONTEND_URL}?payment=success`,
      cancel_url:  `${FRONTEND_URL}?payment=cancelled`,
      metadata: { userId: String(user._id) },
      subscription_data: {
        metadata: { userId: String(user._id) },
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[stripe] create-checkout:', err.message);
    res.status(500).json({ error: 'Erreur création paiement' });
  }
});

// POST /api/stripe/webhook  →  reçoit les events Stripe (paiement réussi, annulation…)
router.post('/webhook', express_raw, async (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('[stripe] webhook signature invalide:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {

      // Abonnement activé / renouvelé
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const sub     = await stripe.subscriptions.retrieve(invoice.subscription);
        const userId  = sub.metadata?.userId;
        if (!userId) break;

        const expiry = new Date(sub.current_period_end * 1000);
        await User.findByIdAndUpdate(userId, { role: 'pro', subscriptionExpiry: expiry });
        console.log(`[stripe] ✅ Pro activé — userId=${userId} jusqu'au ${expiry.toISOString()}`);
        break;
      }

      // Abonnement annulé / expiré
      case 'customer.subscription.deleted': {
        const sub    = event.data.object;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await User.findByIdAndUpdate(userId, { role: 'free', subscriptionExpiry: null });
        console.log(`[stripe] ❌ Pro révoqué — userId=${userId}`);
        break;
      }

      // Échec de paiement
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const sub     = await stripe.subscriptions.retrieve(invoice.subscription);
        const userId  = sub.metadata?.userId;
        console.warn(`[stripe] ⚠️ Paiement échoué — userId=${userId}`);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('[stripe] webhook handler error:', err.message);
  }

  res.json({ received: true });
});

// Middleware pour lire le raw body (nécessaire pour vérifier la signature Stripe)
function express_raw(req, res, next) {
  // Ce middleware est monté sur la route webhook uniquement dans index.js
  next();
}

export default router;
