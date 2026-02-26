const Supply = require('../../models/Supply');
const Company = require('../../models/Company');

// Import test setup
require('../setup');

describe('Supply Model', () => {
  let company;

  beforeEach(async () => {
    company = await Company.create({ name: 'Test Company' });
  });

  describe('create', () => {
    it('should create a supply with valid data', async () => {
      // Arrange
      const supplyData = {
        company_id: company._id,
        name: 'Bandages',
        quantity_on_hand: 50,
        reorder_threshold: 5,
      };

      // Act
      const supply = await Supply.create(supplyData);

      // Assert
      expect(supply).toBeDefined();
      expect(supply.name).toBe('Bandages');
      expect(supply.quantity_on_hand).toBe(50);
      expect(supply.reorder_threshold).toBe(5);
    });

    it('should have default quantity of 0', async () => {
      // Act
      const supply = await Supply.create({
        company_id: company._id,
        name: 'Gauze',
      });

      // Assert
      expect(supply.quantity_on_hand).toBe(0);
    });
  });

  describe('quantity management', () => {
    it('should decrement quantity when supply is used', async () => {
      // Arrange
      const supply = await Supply.create({
        company_id: company._id,
        name: 'Bandages',
        quantity_on_hand: 50,
      });

      // Act
      supply.quantity_on_hand -= 2;
      await supply.save();

      // Assert
      const updated = await Supply.findById(supply._id);
      expect(updated.quantity_on_hand).toBe(48);
    });

    it('should allow bulk quantity updates via MongoDB', async () => {
      // Arrange
      await Supply.create({
        company_id: company._id,
        name: 'Bandages',
        quantity_on_hand: 50,
      });

      // Act - use MongoDB $inc operator
      await Supply.findOneAndUpdate(
        { company_id: company._id, name: 'Bandages' },
        { $inc: { quantity_on_hand: -5 } }
      );

      // Assert
      const updated = await Supply.findOne({ name: 'Bandages' });
      expect(updated.quantity_on_hand).toBe(45);
    });
  });

  describe('reorder alerts', () => {
    it('should know when stock is below reorder threshold', async () => {
      // Arrange
      const supply = await Supply.create({
        company_id: company._id,
        name: 'Bandages',
        quantity_on_hand: 3,
        reorder_threshold: 5,
      });

      // Assert
      expect(supply.quantity_on_hand < supply.reorder_threshold).toBe(true);
    });

    it('should identify supplies needing reorder', async () => {
      // Arrange
      const company2 = await Company.create({ name: 'Company 2' });
      await Supply.create({
        company_id: company._id,
        name: 'Bandages',
        quantity_on_hand: 3,
        reorder_threshold: 5,
      });
      await Supply.create({
        company_id: company._id,
        name: 'Gauze',
        quantity_on_hand: 20,
        reorder_threshold: 5,
      });
      await Supply.create({
        company_id: company2._id,
        name: 'Other',
        quantity_on_hand: 2,
        reorder_threshold: 10,
      });

      // Act
      const lowStock = await Supply.find({
        company_id: company._id,
        $expr: { $lt: ['$quantity_on_hand', '$reorder_threshold'] },
      });

      // Assert
      expect(lowStock.length).toBe(1);
      expect(lowStock[0].name).toBe('Bandages');
    });
  });

  describe('multi-tenant isolation', () => {
    it('should isolate supplies by company_id', async () => {
      // Arrange
      const company2 = await Company.create({ name: 'Other Company' });
      await Supply.create({
        company_id: company._id,
        name: 'Bandages',
        quantity_on_hand: 50,
      });
      await Supply.create({
        company_id: company2._id,
        name: 'Bandages',
        quantity_on_hand: 100,
      });

      // Act
      const company1Supplies = await Supply.find({ company_id: company._id });
      const company2Supplies = await Supply.find({ company_id: company2._id });

      // Assert
      expect(company1Supplies[0].quantity_on_hand).toBe(50);
      expect(company2Supplies[0].quantity_on_hand).toBe(100);
    });
  });
});
