const prisma = require('../lib/prisma');
const { sendEmail } = require('../utils/sendEmail');
const AppError = require('../utils/AppError');

/**
 * Build a structured invoice object from a completed job.
 * Looks up unit prices from the supplies table so the invoice
 * reflects the company's current pricing for each item used.
 */
async function buildInvoice(companyId, jobId) {
  const job = await prisma.job.findFirst({
    where: { id: String(jobId), companyId: String(companyId) },
    include: {
      client: {
        select: { id: true, name: true, location: true, contactInfo: true },
      },
      assignedUser: { select: { id: true, name: true, email: true } },
      jobLocations: {
        include: {
          location: { select: { id: true, name: true, address: true, locationCode: true } },
        },
      },
      location: { select: { id: true, name: true, address: true, locationCode: true } },
    },
  });

  if (!job) throw new AppError('Job not found', 404);
  if (job.status !== 'completed') throw new AppError('Invoice can only be generated for completed jobs', 400);

  const suppliesUsed = Array.isArray(job.suppliesUsed) ? job.suppliesUsed : [];
  if (suppliesUsed.length === 0) {
    throw new AppError('No supplies were used on this job — nothing to invoice', 400);
  }

  const supplyNames = suppliesUsed.map((s) => s.name).filter(Boolean);
  const supplyRows = await prisma.supply.findMany({
    where: { companyId: String(companyId), name: { in: supplyNames } },
    select: { name: true, unitPrice: true },
  });

  const priceMap = new Map();
  for (const s of supplyRows) {
    priceMap.set(s.name, s.unitPrice != null ? Number(s.unitPrice) : 0);
  }

  const lineItems = suppliesUsed.map((item) => {
    const qty = Number(item.quantity) || 0;
    const unitPrice = priceMap.get(item.name) ?? 0;
    return {
      name: item.name,
      quantity: qty,
      unit_price: unitPrice,
      line_total: Math.round(qty * unitPrice * 100) / 100,
    };
  });

  const subtotal = lineItems.reduce((sum, li) => sum + li.line_total, 0);
  const total = Math.round(subtotal * 100) / 100;

  const stations = (job.jobLocations || []).map((jl) => jl.location).filter(Boolean);
  if (!stations.length && job.location) stations.push(job.location);

  return {
    job_id: job.id,
    company_id: companyId,
    client: {
      name: job.client?.name || 'Unknown',
      location: job.client?.location || '',
      contact_info: job.client?.contactInfo || '',
    },
    technician: job.assignedUser?.name || 'Unassigned',
    service_date: job.scheduledDate,
    completed_at: job.completedAt,
    stations: stations.map((s) => ({
      name: s.name,
      address: s.address || '',
      location_code: s.locationCode || '',
    })),
    line_items: lineItems,
    subtotal,
    total,
    generated_at: new Date().toISOString(),
  };
}

function renderInvoiceHtml(invoice) {
  const rows = invoice.line_items
    .map(
      (li) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${li.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${li.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">$${li.unit_price.toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">$${li.line_total.toFixed(2)}</td>
    </tr>`,
    )
    .join('');

  const stationsList = invoice.stations.length
    ? invoice.stations
        .map((s) => `<li>${s.name}${s.location_code ? ` (${s.location_code})` : ''}${s.address ? ` — ${s.address}` : ''}</li>`)
        .join('')
    : '<li>N/A</li>';

  const serviceDate = invoice.service_date
    ? new Date(invoice.service_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'N/A';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e293b;background:#f8fafc">
<div style="max-width:640px;margin:32px auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
  <div style="background:#1e40af;color:#fff;padding:24px 28px">
    <h1 style="margin:0;font-size:22px;font-weight:700">Service Invoice</h1>
    <p style="margin:6px 0 0;font-size:13px;opacity:0.85">Job ${invoice.job_id}</p>
  </div>

  <div style="padding:24px 28px">
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#64748b;width:120px">Client</td>
        <td style="padding:4px 0;font-size:14px;font-weight:600">${invoice.client.name}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#64748b">Service Date</td>
        <td style="padding:4px 0;font-size:14px">${serviceDate}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#64748b">Technician</td>
        <td style="padding:4px 0;font-size:14px">${invoice.technician}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#64748b;vertical-align:top">Stations</td>
        <td style="padding:4px 0;font-size:14px"><ul style="margin:0;padding-left:18px">${stationsList}</ul></td>
      </tr>
    </table>

    <h2 style="font-size:15px;font-weight:600;margin:24px 0 8px;border-bottom:2px solid #e2e8f0;padding-bottom:6px">Supplies Used</h2>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:600;text-transform:uppercase;color:#64748b">Item</th>
          <th style="padding:8px 12px;text-align:center;font-size:12px;font-weight:600;text-transform:uppercase;color:#64748b">Qty</th>
          <th style="padding:8px 12px;text-align:right;font-size:12px;font-weight:600;text-transform:uppercase;color:#64748b">Unit Price</th>
          <th style="padding:8px 12px;text-align:right;font-size:12px;font-weight:600;text-transform:uppercase;color:#64748b">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:12px 12px;text-align:right;font-size:15px;font-weight:700;border-top:2px solid #1e293b">Total</td>
          <td style="padding:12px 12px;text-align:right;font-size:15px;font-weight:700;border-top:2px solid #1e293b;color:#1e40af">$${invoice.total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div style="background:#f1f5f9;padding:16px 28px;font-size:12px;color:#64748b;text-align:center">
    Generated ${new Date(invoice.generated_at).toLocaleString('en-US')}
  </div>
</div>
</body>
</html>`;
}

async function sendInvoiceEmail(invoice, toEmail) {
  let to = toEmail;
  if (!to && invoice.client.contact_info) {
    const match = invoice.client.contact_info.match(/\S+@\S+\.\S+/);
    if (match) to = match[0];
  }
  if (!to) {
    throw new AppError('No recipient email provided and none found in client contact info', 400);
  }

  const html = renderInvoiceHtml(invoice);

  await sendEmail({
    to,
    subject: `Invoice — ${invoice.client.name} — $${invoice.total.toFixed(2)}`,
    html,
  });

  return { sent_to: to };
}

module.exports = { buildInvoice, sendInvoiceEmail, renderInvoiceHtml };
