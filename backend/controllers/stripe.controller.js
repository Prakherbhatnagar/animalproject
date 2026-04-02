import Stripe from 'stripe';
import Donation from '../models/Donation.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');

export const createCheckoutSession = async (req, res) => {
  try {
    const { amount, donorPhone, donorName, ngoId } = req.body;

    if (!amount || !donorPhone || !ngoId) {
      return res.status(400).json({ message: 'Amount, donorPhone, and ngoId are required.' });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: 'Donation to NGO',
            },
            unit_amount: Math.round(amount * 100), // Stripe expects amounts in cents/paise
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/donation-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/donation-cancel`,
      metadata: {
        donorPhone,
        donorName: donorName || 'Anonymous',
        ngoId
      }
    });

    res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ message: 'Failed to create Stripe checkout session' });
  }
};

export const webhookListener = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // The request body needs to be raw buffer for signature verification
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock'
    );
  } catch (err) {
    console.error(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      // Save donation to DB asynchronously
      const donation = new Donation({
        amount: session.amount_total / 100, // convert paise back to rupees
        currency: session.currency,
        donorPhone: session.metadata.donorPhone,
        donorName: session.metadata.donorName,
        ngoId: session.metadata.ngoId,
        status: 'completed',
        transactionId: session.payment_intent || session.id,
        paymentChannel: 'stripe',
      });
      await donation.save();
      console.log('Donation successfully recorded via webhook.');
    } catch (dbError) {
      console.error('Error saving donation from webhook:', dbError);
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
};
