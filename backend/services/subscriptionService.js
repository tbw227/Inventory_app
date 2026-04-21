const getStripe = require('../config/stripe');
const prisma = require('../lib/prisma');
const AppError = require('../utils/AppError');

const PLAN_ENV_KEYS = {
  basic: 'STRIPE_PRICE_BASIC',
  growth: 'STRIPE_PRICE_GROWTH',
  pro: 'STRIPE_PRICE_PRO',
};

function mapStripeSubscriptionStatus(stripeStatus) {
  const m = {
    active: 'active',
    trialing: 'trial',
    past_due: 'past_due',
    canceled: 'cancelled',
    cancelled: 'cancelled',
    unpaid: 'past_due',
    incomplete: 'incomplete',
    incomplete_expired: 'cancelled',
    paused: 'past_due',
  };
  return m[stripeStatus] || 'active';
}

async function ensureStripeCustomer(company) {
  const stripe = getStripe();
  if (company.stripeCustomerId) {
    return company.stripeCustomerId;
  }
  const customer = await stripe.customers.create({
    name: company.name,
    metadata: { companyId: String(company.id) },
  });
  await prisma.company.update({
    where: { id: company.id },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

async function createSubscriptionCheckoutSession(companyId, plan, successUrl, cancelUrl) {
  const envKey = PLAN_ENV_KEYS[plan];
  const priceId = envKey ? process.env[envKey] : null;
  if (!priceId || !String(priceId).trim()) {
    throw new AppError(
      `Stripe subscription price not configured. Set ${envKey} in the environment.`,
      503
    );
  }

  const company = await prisma.company.findUnique({ where: { id: String(companyId) } });
  if (!company) {
    throw new AppError('Company not found', 404);
  }

  const stripe = getStripe();
  const customerId = await ensureStripeCustomer(company);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId.trim(), quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      companyId: String(companyId),
      plan,
    },
    subscription_data: {
      metadata: {
        companyId: String(companyId),
        plan,
      },
    },
  });

  if (!session.url) {
    throw new AppError('Checkout session did not return a URL', 500);
  }

  return { url: session.url };
}

async function createBillingPortalSession(companyId, returnUrl) {
  const company = await prisma.company.findUnique({ where: { id: String(companyId) } });
  if (!company) {
    throw new AppError('Company not found', 404);
  }
  if (!company.stripeCustomerId) {
    throw new AppError('No Stripe customer for this company yet. Start a subscription from checkout first.', 400);
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: company.stripeCustomerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

async function applySubscriptionFromStripe(subscription) {
  const companyId = subscription.metadata?.companyId;
  if (!companyId) return null;

  const company = await prisma.company.findUnique({ where: { id: String(companyId) } });
  if (!company) return null;

  const data = {
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: mapStripeSubscriptionStatus(subscription.status),
  };
  if (subscription.metadata?.plan) {
    data.subscriptionTier = subscription.metadata.plan;
  }
  if (subscription.current_period_end) {
    data.subscriptionCurrentPeriodEnd = new Date(subscription.current_period_end * 1000);
  }
  await prisma.company.update({
    where: { id: company.id },
    data,
  });
  return prisma.company.findUnique({ where: { id: company.id } });
}

async function handleStripeSubscriptionEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode !== 'subscription' || !session.subscription) break;
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(session.subscription, {
        expand: ['items.data.price'],
      });
      await applySubscriptionFromStripe(sub);
      break;
    }
    case 'customer.subscription.updated': {
      await applySubscriptionFromStripe(event.data.object);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const companyId = sub.metadata?.companyId;
      if (!companyId) break;
      await prisma.company.update({
        where: { id: String(companyId) },
        data: {
          stripeSubscriptionId: '',
          subscriptionStatus: 'cancelled',
          subscriptionCurrentPeriodEnd: null,
        },
      });
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const customerId =
        typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      if (!customerId) break;
      await prisma.company.updateMany({
        where: { stripeCustomerId: String(customerId) },
        data: { subscriptionStatus: 'past_due' },
      });
      break;
    }
    case 'invoice.paid': {
      const invoice = event.data.object;
      if (invoice.subscription) {
        const stripe = getStripe();
        const sub = await stripe.subscriptions.retrieve(invoice.subscription);
        await applySubscriptionFromStripe(sub);
      }
      break;
    }
    default:
      break;
  }
}

module.exports = {
  createSubscriptionCheckoutSession,
  createBillingPortalSession,
  handleStripeSubscriptionEvent,
  ensureStripeCustomer,
  mapStripeSubscriptionStatus,
};
