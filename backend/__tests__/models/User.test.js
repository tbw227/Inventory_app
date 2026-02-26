const User = require('../../models/User');
const Company = require('../../models/Company');

// Import test setup
require('../setup');

describe('User Model', () => {
  let company;

  beforeEach(async () => {
    // Create a company for each test
    company = await Company.create({
      name: 'Test Company',
    });
  });

  describe('create', () => {
    it('should create a user with valid data', async () => {
      // Arrange
      const userData = {
        company_id: company._id,
        role: 'technician',
        name: 'Bob Tech',
        email: 'bob@example.com',
        password_hash: 'hashed_pwd',
        phone: '555-1234',
      };

      // Act
      const user = await User.create(userData);

      // Assert
      expect(user).toBeDefined();
      expect(user.name).toBe('Bob Tech');
      expect(user.role).toBe('technician');
      expect(user.company_id).toEqual(company._id);
    });

    it('should enforce role enum (technician or admin)', async () => {
      // Arrange & Act & Assert
      try {
        await User.create({
          company_id: company._id,
          role: 'invalid_role',
          name: 'Invalid User',
          email: 'invalid@example.com',
          password_hash: 'hashed_pwd',
        });
        fail('Should have thrown validation error');
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should require company_id', async () => {
      // Arrange & Act & Assert
      try {
        await User.create({
          role: 'technician',
          name: 'No Company',
          email: 'nocompany@example.com',
          password_hash: 'hashed_pwd',
        });
        fail('Should have thrown validation error');
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('read', () => {
    it('should find users by company_id', async () => {
      // Arrange
      await User.create({
        company_id: company._id,
        role: 'admin',
        name: 'Alice',
        email: 'alice@example.com',
        password_hash: 'hashed_pwd',
      });

      // Act
      const users = await User.find({ company_id: company._id });

      // Assert
      expect(users.length).toBe(1);
      expect(users[0].name).toBe('Alice');
    });

    it('should isolate users by company', async () => {
      // Arrange
      const company2 = await Company.create({ name: 'Other Company' });
      await User.create({
        company_id: company._id,
        role: 'admin',
        name: 'Alice',
        email: 'alice@example.com',
        password_hash: 'hashed_pwd',
      });
      await User.create({
        company_id: company2._id,
        role: 'admin',
        name: 'Bob',
        email: 'bob@example.com',
        password_hash: 'hashed_pwd',
      });

      // Act
      const usersCompany1 = await User.find({ company_id: company._id });
      const usersCompany2 = await User.find({ company_id: company2._id });

      // Assert
      expect(usersCompany1.length).toBe(1);
      expect(usersCompany2.length).toBe(1);
      expect(usersCompany1[0].name).toBe('Alice');
      expect(usersCompany2[0].name).toBe('Bob');
    });
  });
});
