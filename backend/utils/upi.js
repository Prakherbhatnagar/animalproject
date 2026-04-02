/**
 * NPCI UPI payment intent (opens PhonePe / GPay / Paytm, etc.)
 * @see https://www.npci.org.in/what-we-do/upi/product-overview
 */
export function buildUpiPayUri({ pa, pn, am, tn, cu = 'INR' }) {
  if (!pa || typeof pa !== 'string') {
    throw new Error('UPI payee address (pa) is required');
  }
  const params = new URLSearchParams();
  params.set('pa', pa.trim());
  params.set('pn', (pn || 'Merchant').slice(0, 99));
  params.set('cu', cu);
  if (am != null && am !== '') {
    const n = Number(am);
    if (!Number.isFinite(n) || n < 0) throw new Error('Invalid amount');
    params.set('am', n.toFixed(2));
  }
  if (tn) params.set('tn', String(tn).slice(0, 99));
  return `upi://pay?${params.toString()}`;
}

export function qrDataUrlForUpi(upiUri) {
  const enc = encodeURIComponent(upiUri);
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&ecc=M&data=${enc}`;
}
