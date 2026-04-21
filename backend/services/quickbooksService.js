/**
 * Optional QuickBooks sync after a payment is marked completed (webhook).
 * OAuth and QBO API access live in `quickbooksIntegrationService` and `/api/integrations/quickbooks/*`.
 * Set QUICKBOOKS_ENABLED=true when invoice/receipt sync from payments is implemented.
 */
async function onPaymentCompleted(payment) {
  if (process.env.QUICKBOOKS_ENABLED !== 'true') {
    return;
  }
  // Hook point: create SalesReceipt or Invoice from payment + job metadata.
  // Requires OAuth tokens (QUICKBOOKS_ACCESS_TOKEN, QUICKBOOKS_REALM_ID, etc.)
  if (!process.env.QUICKBOOKS_REALM_ID) {
    console.warn('QuickBooks enabled but QUICKBOOKS_REALM_ID is not set');
    return;
  }
  console.info('QuickBooks: payment completed recorded locally; invoice sync not yet implemented', {
    paymentId: payment.id,
    amount: payment.amount,
  });
}

module.exports = { onPaymentCompleted };
