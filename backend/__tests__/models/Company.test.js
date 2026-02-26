const mongoose = require('mongoose');
const Company = require('../../models/Company');

// Import test setup
require('../setup');

describe('Company Model', () => {
  describe('create', () => {
    it('should create a company with valid data', async () => {
      // Arrange
      const companyData = {
        name: 'SafeCo Services',
        contact_info: 'safe@example.com',
        subscription_tier: 'basic',
      };

      // Act
      const company = await Company.create(companyData);

      // Assert
      expect(company).toBeDefined();
      expect(company.name).toBe('SafeCo Services');
      expect(company.subscription_tier).toBe('basic');
      expect(company._id).toBeDefined();
    });

    it('should fail if name is missing', async () => {
      // Arrange
      const invalidData = {
        contact_info: 'safe@example.com',
      };

      // Act & Assert
      try {
        await Company.create(invalidData);
        fail('Should have thrown validation error');
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should have default subscription tier of basic', async () => {
      // Arrange
      const companyData = {
        name: 'Test Company',
      };

      // Act
      const company = await Company.create(companyData);

      // Assert
      expect(company.subscription_tier).toBe('basic');
    });
  });

  describe('read', () => {
    it('should retrieve a company by id', async () => {
      // Arrange
      const created = await Company.create({ name: 'Find Me Co' });

      // Act
      const found = await Company.findById(created._id);

      // Assert
      expect(found).toBeDefined();
      expect(found.name).toBe('Find Me Co');
    });

    it('should find all companies', async () => {
      // Arrange
      await Company.create({ name: 'Company 1' });
      await Company.create({ name: 'Company 2' });

      // Act
      const companies = await Company.find();

      // Assert
      expect(companies.length).toBe(2);
    });
  });

  describe('update', () => {
    it('should update company fields', async () => {
      // Arrange
      const company = await Company.create({ name: 'Old Name' });

      // Act
      company.name = 'New Name';
      await company.save();

      // Assert
      const updated = await Company.findById(company._id);
      expect(updated.name).toBe('New Name');
    });
  });

  describe('delete', () => {
    it('should delete a company', async () => {
      // Arrange
      const company = await Company.create({ name: 'To Delete' });

      // Act
      await Company.deleteOne({ _id: company._id });

      // Assert
      const found = await Company.findById(company._id);
      expect(found).toBeNull();
    });
  });
});
