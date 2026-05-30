/**
 * Synthetic revenue for demos when DASHBOARD_DEMO_REVENUE=true and the tenant has no real payments.
 */

function isDemoRevenueEnabled() {
  const raw = process.env.DASHBOARD_DEMO_REVENUE;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  // Default on outside production so local demos work without extra env.
  return process.env.NODE_ENV !== 'production';
}

function dailyAmount(dayIndex, days) {
  const phase = dayIndex / Math.max(days, 1);
  const weekdayBoost = dayIndex % 7 === 0 || dayIndex % 7 === 6 ? 0.55 : 1;
  const base = 750 + 420 * Math.sin(phase * Math.PI * 2) + dayIndex * 18;
  return Math.round(base * weekdayBoost * 100) / 100;
}

function buildDailySeries(days) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const revenue_over_time = [];
  let sum = 0;
  for (let i = days - 1; i >= 0; i -= 1) {
    const dt = new Date(end);
    dt.setDate(dt.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    const total = dailyAmount(days - 1 - i, days);
    revenue_over_time.push({ _id: key, total });
    sum += total;
  }
  return { revenue_over_time, sum };
}

function buildDemoRevenueAnalytics(days, role = 'admin') {
  const scale = role === 'technician' ? 0.38 : 1;
  const { revenue_over_time, sum } = buildDailySeries(days);
  const scaledSeries = revenue_over_time.map((row) => ({
    _id: row._id,
    total: Math.round(row.total * scale * 100) / 100,
  }));
  const total_revenue = Math.round(sum * scale * 100) / 100;
  const completed_payments = Math.max(8, Math.round(days * 1.4 * scale));

  const techNames = ['Alex Rivera', 'Jordan Lee', 'Sam Patel', 'Casey Morgan'];
  const revenue_by_technician =
    role === 'admin'
      ? techNames.map((name, i) => {
          const share = [0.32, 0.27, 0.23, 0.18][i];
          const total = Math.round(total_revenue * share * 100) / 100;
          return {
            technician_id: `demo-tech-${i + 1}`,
            name,
            total,
            count: Math.max(2, Math.round(completed_payments * share)),
          };
        })
      : [];

  const clients = [
    'Metro Health Campus',
    'Riverside Manufacturing',
    'Summit Office Park',
    'Harbor Logistics',
    'Northside Schools',
    'Lakeview Retail',
  ];
  const revenue_by_job =
    role === 'admin'
      ? clients.slice(0, 6).map((client_name, i) => {
          const share = [0.22, 0.19, 0.17, 0.15, 0.14, 0.13][i];
          return {
            job_id: `demo-job-${i + 1}`,
            client_name,
            total: Math.round(total_revenue * share * 100) / 100,
            payment_count: Math.max(1, Math.round(completed_payments * share * 0.4)),
            scheduled_date: new Date(),
            status: 'completed',
          };
        })
      : clients.slice(0, 4).map((client_name, i) => ({
          job_id: `demo-job-${i + 1}`,
          client_name,
          total: Math.round(((total_revenue / 4) * (1.1 - i * 0.08)) * 100) / 100,
          payment_count: 1,
          scheduled_date: new Date(),
          status: 'completed',
        }));

  return {
    days,
    total_revenue,
    completed_payments,
    revenue_over_time: scaledSeries,
    revenue_by_technician,
    revenue_by_job,
    total_jobs: role === 'admin' ? 142 : 48,
    jobs_completed: role === 'admin' ? 96 : 31,
    demo: true,
  };
}

function buildDemoProfileRevenue(role = 'admin') {
  const shop = 42850.5;
  const tech = 14200.25;
  if (role === 'technician') {
    return {
      shop_revenue: Math.round(shop * 0.38 * 100) / 100,
      tech_revenue: tech,
      payment_count_shop: 18,
      payment_count_tech: 12,
      demo: true,
    };
  }
  return {
    shop_revenue: shop,
    tech_revenue: tech,
    payment_count_shop: 47,
    payment_count_tech: 12,
    demo: true,
  };
}

module.exports = {
  isDemoRevenueEnabled,
  buildDemoRevenueAnalytics,
  buildDemoProfileRevenue,
};
