const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const Job = require('../../models/Job');
const Company = require('../../models/Company');
const User = require('../../models/User');
const Client = require('../../models/Client');
const Supply = require('../../models/Supply');

// Import test setup
require('../setup');

// Create a minimal Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(bodyParser.json());
  app.use('/api/jobs', require('../../routes/jobs'));
  return app;
};

describe('Jobs Routes', () => {
  let app, company, user, client, supply;

  beforeEach(async () => {
    app = createTestApp();
    
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
    supply = await Supply.create({
      company_id: company._id,
      name: 'Bandages',
      quantity_on_hand: 50,
      reorder_threshold: 5,
    });
  });

  describe('POST /api/jobs', () => {
    it('should create a job', async () => {
      // Arrange
      const jobData = {
        company_id: company._id.toString(),
        client_id: client._id.toString(),
        assigned_user_id: user._id.toString(),
        scheduled_date: new Date(),
      };

      // Act
      const response = await request(app)
        .post('/api/jobs')
        .send(jobData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toBeDefined();
      expect(response.body.status).toBe('pending');
    });

    it('should return 400 for missing required fields', async () => {
      // Act
      const response = await request(app)
        .post('/api/jobs')
        .send({ client_id: 'test' });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/jobs/company/:companyId', () => {
    it('should return jobs for a specific company', async () => {
      // Arrange
      await Job.create({
        company_id: company._id,
        client_id: client._id,
        assigned_user_id: user._id,
        scheduled_date: new Date(),
      });

      // Act
      const response = await request(app)
        .get(`/api/jobs/company/${company._id.toString()}`);

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
    });

    it('should return empty array for company with no jobs', async () => {
      // Act
      const response = await request(app)
        .get(`/api/jobs/company/${company._id.toString()}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(0);
    });
  });

  describe('POST /api/jobs/:id/complete', () => {
    it('should complete a job and decrement inventory', async () => {
      // Arrange
      const job = await Job.create({
        company_id: company._id,
        client_id: client._id,
        assigned_user_id: user._id,
        scheduled_date: new Date(),
      });

      const completeData = {
        suppliesUsed: [{ name: 'Bandages', quantity: 5 }],
        photos: ['https://example.com/photo.jpg'],
        clientEmail: 'client@example.com',
      };

      // Act
      const response = await request(app)
        .post(`/api/jobs/${job._id.toString()}/complete`)
        .send(completeData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('completed');

      // Verify job was updated
      const updatedJob = await Job.findById(job._id);
      expect(updatedJob.status).toBe('completed');
      expect(updatedJob.supplies_used.length).toBe(1);
      expect(updatedJob.photos.length).toBe(1);
    });

    it('should decrement supply quantity when job is completed', async () => {
      // Arrange
      const job = await Job.create({
        company_id: company._id,
        client_id: client._id,
        assigned_user_id: user._id,
        scheduled_date: new Date(),
      });

      const initialQuantity = supply.quantity_on_hand;

      // Act
      await request(app)
        .post(`/api/jobs/${job._id.toString()}/complete`)
        .send({
          suppliesUsed: [{ name: 'Bandages', quantity: 3 }],
          photos: [],
          clientEmail: 'test@example.com',
        });

      // Assert
      const updatedSupply = await Supply.findById(supply._id);
      expect(updatedSupply.quantity_on_hand).toBe(initialQuantity - 3);
    });

    it('should return 404 for non-existent job', async () => {
      // Act
      const fakeId = '000000000000000000000000';
      const response = await request(app)
        .post(`/api/jobs/${fakeId}/complete`)
        .send({
          suppliesUsed: [],
          photos: [],
        });

      // Assert
      expect(response.status).toBe(404);
    });

    it('should handle multiple supplies used', async () => {
      // Arrange
      const supply2 = await Supply.create({
        company_id: company._id,
        name: 'Gauze',
        quantity_on_hand: 30,
      });

      const job = await Job.create({
        company_id: company._id,
        client_id: client._id,
        assigned_user_id: user._id,
        scheduled_date: new Date(),
      });

      // Act
      await request(app)
        .post(`/api/jobs/${job._id.toString()}/complete`)
        .send({
          suppliesUsed: [
            { name: 'Bandages', quantity: 2 },
            { name: 'Gauze', quantity: 1 },
          ],
          photos: [],
          clientEmail: 'test@example.com',
        });

      // Assert
      const updatedSupply1 = await Supply.findById(supply._id);
      const updatedSupply2 = await Supply.findById(supply2._id);
      expect(updatedSupply1.quantity_on_hand).toBe(48);
      expect(updatedSupply2.quantity_on_hand).toBe(29);
    });
  });
});
