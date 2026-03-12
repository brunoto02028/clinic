// lib/stripe-marketplace.ts
// Stripe auto-sync for marketplace products — creates/updates Stripe Products + Prices

import Stripe from 'stripe'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Stripe(key, { apiVersion: '2024-06-20' as any })
}

/**
 * Create or update a Stripe product + price for a marketplace product.
 * Returns { stripeProductId, stripePriceId }
 */
export async function syncProductToStripe(product: {
  id: string
  name: string
  description?: string | null
  price: number
  currency?: string
  imageUrl?: string | null
  isDigital?: boolean
  isAffiliate?: boolean
  stripeProductId?: string | null
  stripePriceId?: string | null
  isActive?: boolean
}): Promise<{ stripeProductId: string; stripePriceId: string }> {
  // Don't sync affiliate products to Stripe
  if (product.isAffiliate) {
    throw new Error('Affiliate products should not be synced to Stripe')
  }

  const stripe = getStripe()
  const currency = (product.currency || 'GBP').toLowerCase()
  const unitAmount = Math.round(product.price * 100) // Convert to pence

  let stripeProductId = product.stripeProductId || ''
  let stripePriceId = product.stripePriceId || ''

  // Create or update the Stripe Product
  if (stripeProductId) {
    // Update existing product
    await stripe.products.update(stripeProductId, {
      name: product.name,
      description: product.description || undefined,
      active: product.isActive !== false,
      images: product.imageUrl ? [product.imageUrl.startsWith('http') ? product.imageUrl : `https://bpr.rehab${product.imageUrl}`] : undefined,
      metadata: {
        marketplace_product_id: product.id,
        is_digital: product.isDigital ? 'true' : 'false',
      },
    })
  } else {
    // Create new product
    const stripeProduct = await stripe.products.create({
      name: product.name,
      description: product.description || undefined,
      active: product.isActive !== false,
      images: product.imageUrl ? [product.imageUrl.startsWith('http') ? product.imageUrl : `https://bpr.rehab${product.imageUrl}`] : [],
      metadata: {
        marketplace_product_id: product.id,
        is_digital: product.isDigital ? 'true' : 'false',
      },
    })
    stripeProductId = stripeProduct.id
  }

  // Check if price needs updating
  if (stripePriceId) {
    // Stripe prices are immutable — check if amount changed
    try {
      const existingPrice = await stripe.prices.retrieve(stripePriceId)
      if (existingPrice.unit_amount !== unitAmount || existingPrice.currency !== currency) {
        // Archive old price and create new one
        await stripe.prices.update(stripePriceId, { active: false })
        const newPrice = await stripe.prices.create({
          product: stripeProductId,
          unit_amount: unitAmount,
          currency,
          metadata: { marketplace_product_id: product.id },
        })
        stripePriceId = newPrice.id
      }
    } catch {
      // Price doesn't exist, create new
      const newPrice = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: unitAmount,
        currency,
        metadata: { marketplace_product_id: product.id },
      })
      stripePriceId = newPrice.id
    }
  } else {
    // Create new price
    const newPrice = await stripe.prices.create({
      product: stripeProductId,
      unit_amount: unitAmount,
      currency,
      metadata: { marketplace_product_id: product.id },
    })
    stripePriceId = newPrice.id
  }

  return { stripeProductId, stripePriceId }
}

/**
 * Deactivate a Stripe product (when marketplace product is deactivated/deleted)
 */
export async function deactivateStripeProduct(stripeProductId: string): Promise<void> {
  if (!stripeProductId) return
  try {
    const stripe = getStripe()
    await stripe.products.update(stripeProductId, { active: false })
  } catch (err) {
    console.error('[stripe-marketplace] Failed to deactivate product:', err)
  }
}
