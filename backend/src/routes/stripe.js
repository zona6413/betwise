import { Router }     from 'express';
import Stripe          from 'stripe';
import User            from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const stripe       = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder');
const router       = Router();
const PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY;
const PRICE_YEARLY  = process.env.STRIPE_PRICE_YEARLY;
const FRONTEND_URL  = (process.env.FRONTEND_URL ?? 'https://betwise.vercel.app').replace(/\/$/, '');

// ── POST /api/stripe/create-checkout ──────────────────────────────────────────
// Crée une session Stripe Checkout et retourne l'URL de paiement
router.post('/create-checkout', requireAuth, async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: 'Paiement non configuré — contacte le support' });
    }
    const { plan } = req.body; // 'monthly' | 'yearly'
    const priceId  = plan === 'yearly' ? PRICE_YEARLY : PRICE_MONTHLY;
    if (!priceId) return res.status(400).json({ error: 'Plan invalide ou prix non configuré' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    // Si l'utilisateur a déjà un customer Stripe, le réutiliser
    const customerParams = user.stripeCustomerId
      ? { customer: user.stripeCustomerId }
      : { customer_email: user.email };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      ...customerParams,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${FRONTEND_URL}?payment=success`,
      cancel_url:  `${FRONTEND_URL}?payment=cancelled`,
      metadata: { userId: String(user._id) },
      subscription_data: {
        metadata: { userId: String(user._id) },
      },
      locale: 'fr',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[stripe] create-checkout:', err.message);
    res.status(500).json({ error: 'Erreur création paiement' });
  }
});

// ── POST /api/stripe/portal ────────────────────────────────────────────────────
// Ouvre le portail Stripe pour gérer / annuler l'abonnement
router.post('/portal', requireAuth, async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: 'Paiement non configuré' });
    }
    const user = await User.findById(req.userId);
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ error: 'Aucun abonnement actif trouvé' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   user.stripeCustomerId,
      return_url: FRONTEND_URL,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[stripe] portal:', err.message);
    res.status(500).json({ error: 'Erreur portail de paiement' });
  }
});

// ── GET /api/stripe/status ─────────────────────────────────────────────────────
// Retourne le statut d'abonnement de l'utilisateur connecté
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json({
      role:               user.role,
      isPro:              user.isPro(),
      subscriptionExpiry: user.subscriptionExpiry,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── POST /api/stripe/webhook ───────────────────────────────────────────────────
// Reçoit les événements Stripe (raw body monté dans index.js)
router.post('/webhook', async (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('[stripe] STRIPE_WEBHOOK_SECRET non défini — webhook ignoré');
    return res.json({ received: true });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('[stripe] webhook signature invalide:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {

      // ── Paiement réussi → activer Pro ──────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.billing_reason === 'subscription_create' || invoice.billing_reason === 'subscription_cycle') {
          const sub    = await stripe.subscriptions.retrieve(invoice.subscription);
          const userId = sub.metadata?.userId;
          if (!userId) break;

          const expiry     = new Date(sub.current_period_end * 1000);
          const customerId = sub.customer;
          await User.findByIdAndUpdate(userId, {
            role: 'pro',
            subscriptionExpiry: expiry,
            stripeCustomerId:   customerId,
          });
          console.log(`[stripe] ✅ Pro activé — userId=${userId} expire=${expiry.toISOString()}`);
        }
        break;
      }

      // ── Abonnement résilié → repasser en free ──────────────────
      case 'customer.subscription.deleted': {
        const sub    = event.data.object;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await User.findByIdAndUpdate(userId, { role: 'free', subscriptionExpiry: null });
        console.log(`[stripe] ❌ Pro révoqué — userId=${userId}`);
        break;
      }

      // ── Abonnement mis à jour (renouvellement, changement de plan) ─
      case 'customer.subscription.updated': {
        const sub    = event.data.object;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        if (sub.status === 'active') {
          const expiry = new Date(sub.current_period_end * 1000);
          await User.findByIdAndUpdate(userId, { role: 'pro', subscriptionExpiry: expiry });
          console.log(`[stripe] 🔄 Abonnement renouvelé — userId=${userId}`);
        } else if (['canceled', 'unpaid', 'past_due'].includes(sub.status)) {
          await User.findByIdAndUpdate(userId, { role: 'free', subscriptionExpiry: null });
          console.log(`[stripe] ⚠️ Abonnement dégradé (${sub.status}) — userId=${userId}`);
        }
        break;
      }

      // ── Échec de paiement ──────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const sub     = await stripe.subscriptions.retrieve(invoice.subscription);
        console.warn(`[stripe] ⚠️ Paiement échoué — userId=${sub.metadata?.userId}`);
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

export default router;
