const Job = require('../../models/Job');
const Company = require('../../models/Company');
const User = require('../../models/User');
const Client = require('../../models/Client');

// Import test setup
require('../setup');

describe('Job Model', () => {
  let company, user, client;

  beforeEach(async () => {
    company = await Company.create({ name: 'Test Company' });
    user = await User.create({
      company_id: company._id,
      role: 'technician',
      name: 'Tech',
      email: 'tech@example.com',
      password_hash: 'pwd',
    });
    client = await Client.create({
      company_id: company._id,
      name: 'Acme Corp',
      location: '123 Main St',
    });
  });

  describe('create', () => {
    it('should create a job with valid data', async () => {
      // Arrange
      const jobData = {
        company_id: company._id,
        client_id: client._id,
        assigned_user_id: user._id,
        scheduled_date: new Date(),
      };

      // Act
      const job = await Job.create(jobData);

      // Assert
      expect(job).toBeDefined();
      expect(job.status).toBe('pending');
      expect(job.supplies_used).toEqual([]);
      expect(job.photos).toEqual([]);
    });

    it('should default status to pending', async () => {
      // Act
      const job = await Job.create({
        company_id: company._id,
        client_id: client._id,
        assigned_user_id: user._id,
        scheduled_date: new Date(),
      });

      // Assert
      expect(job.status).toBe('pending');
    });
  });

  describe('supplies_used field', () => {
    it('should store supplies used with name and quantity', async () => {
      // Arrange
      const job = await Job.create({
        company_id: company._id,
        client_id: client._id,
        assigned_user_id: user._id,
        scheduled_date: new Date(),
      });

      // Act
      job.supplies_used = [
        { name: 'Bandages', quantity: 2 },
        { name: 'Gauze', quantity: 1 },
      ];
      await job.save();

      // Assert
      const saved = await Job.findById(job._id);
      expect(saved.supplies_used.length).toBe(2);
      expect(saved.supplies_used[0].name).toBe('Bandages');
      expect(saved.supplies_used[0].quantity).toBe(2);
    });
  });

  describe('photos field', () => {
    it('should store multiple photo URLs', async () => {
      // Arrange
      const job = await Job.create({
        company_id: company._id,
        client_id: client._id,
        assigned_user_id: user._id,
        scheduled_date: new Date(),
      });

      // Act
      job.photos = ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'];
      await job.save();

      // Assert
      const saved = await Job.findById(job._id);
      expect(saved.photos.length).toBe(2);
      expect(saved.photos[0]).toContain('photo1');
    });
  });

  describe('job completion', () => {
    it('should mark job as completed with timestamp', async () => {
      // Arrange
      const job = await Job.create({
        company_id: company._id,
        client_id: client._id,
        assigned_user_id: user._id,
        scheduled_date: new Date(),
      });

      // Act
      job.status = 'completed';
      job.completed_at = new Date();
      await job.save();

      // Assert
      const saved = await Job.findById(job._id);
      expect(saved.status).toBe('completed');
      expect(saved.completed_at).toBeDefined();
    });

    it('should store service report URL after completion', async () => {
      // Arrange
      const job = await Job.create({
        company_id: company._id,
        client_id: client._id,
        assigned_user_id: user._id,
        scheduled_date: new Date(),
      });

      // Act
      job.status = 'completed';
      job.completed_at = new Date();
      job.service_report_url = 'uploads/report-123.pdf';
      await job.save();

      // Assert
      const saved = await Job.findById(job._id);
      expect(saved.service_report_url).toBe('uploads/report-123.pdf');
    });
  });

  describe('multi-tenant isolation', () => {
    it('should isolate jobs by company_id', async () => {
      // Arrange
      const company2 = await Company.create({ name: 'Other Company' });
      const user2 = await User.create({
        company_id: company2._id,
        role: 'technician',
        name: 'Tech2',
        email: 'tech2@example.com',
        password_hash: 'pwd',
      });
      const client2 = await Client.create({
        company_id: company2._id,
        name: 'Other Client',
        location: '456 Oak St',
      });

      await Job.create({
        company_id: company._id,
        client_id: client._id,
        assigned_user_id: user._id,
        scheduled_date: new Date(),
      });
      await Job.create({
        company_id: company2._id,
        client_id: client2._id,
        assigned_user_id: user2._id,
        scheduled_date: new Date(),
      });

      // Act
      const jobsCompany1 = await Job.find({ company_id: company._id });
      const jobsCompany2 = await Job.find({ company_id: company2._id });

      // Assert
      expect(jobsCompany1.length).toBe(1);
      expect(jobsCompany2.length).toBe(1);
    });
  });
});
