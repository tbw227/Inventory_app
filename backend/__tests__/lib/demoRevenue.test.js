const { buildDemoRevenueAnalytics, buildDemoProfileRevenue, isDemoRevenueEnabled } = require('../../lib/demoRevenue');

describe('demoRevenue', () => {
  const prev = process.env.DASHBOARD_DEMO_REVENUE;

  afterEach(() => {
    process.env.DASHBOARD_DEMO_REVENUE = prev;
  });

  it('isDemoRevenueEnabled reads env flag', () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.DASHBOARD_DEMO_REVENUE = 'true';
    expect(isDemoRevenueEnabled()).toBe(true);
    process.env.DASHBOARD_DEMO_REVENUE = 'false';
    expect(isDemoRevenueEnabled()).toBe(false);
    delete process.env.DASHBOARD_DEMO_REVENUE;
    expect(isDemoRevenueEnabled()).toBe(false);
    process.env.NODE_ENV = 'test';
    delete process.env.DASHBOARD_DEMO_REVENUE;
    expect(isDemoRevenueEnabled()).toBe(true);
    process.env.NODE_ENV = prevNode;
  });

  it('buildDemoRevenueAnalytics returns chart-ready series', () => {
    const data = buildDemoRevenueAnalytics(30, 'admin');
    expect(data.demo).toBe(true);
    expect(data.total_revenue).toBeGreaterThan(0);
    expect(data.revenue_over_time).toHaveLength(30);
    expect(data.revenue_by_technician.length).toBeGreaterThan(0);
    expect(data.revenue_by_job[0].client_name).toBeTruthy();
  });

  it('buildDemoProfileRevenue returns shop and tech totals', () => {
    const data = buildDemoProfileRevenue('admin');
    expect(data.demo).toBe(true);
    expect(data.shop_revenue).toBeGreaterThan(data.tech_revenue);
  });
});
