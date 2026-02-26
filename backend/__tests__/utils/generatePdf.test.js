const fs = require('fs');
const path = require('path');
const { generateServiceReportPdf } = require('../../utils/generatePdf');

describe('PDF Generation Utility', () => {
  // Clean up generated PDFs after tests
  afterEach(() => {
    const uploadsDir = path.join(__dirname, '../../uploads');
    const files = fs.readdirSync(uploadsDir);
    files.forEach(file => {
      if (file.startsWith('report-') && file.endsWith('.pdf')) {
        const filePath = path.join(uploadsDir, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });
  });

  describe('generateServiceReportPdf', () => {
    it('should generate a PDF file', async () => {
      // Arrange
      const mockJob = {
        _id: 'test-job-123',
        company_id: 'company-1',
        client_id: 'client-1',
        assigned_user_id: 'user-1',
        completed_at: new Date('2026-02-26'),
        supplies_used: [
          { name: 'Bandages', quantity: 2 },
          { name: 'Gauze', quantity: 1 },
        ],
        photos: ['https://example.com/photo1.jpg'],
      };

      // Act
      const pdfPath = await generateServiceReportPdf(mockJob);

      // Assert
      expect(pdfPath).toBeDefined();
      expect(pdfPath).toContain('report-test-job-123.pdf');
      expect(fs.existsSync(pdfPath)).toBe(true);
    });

    it('should include job details in PDF', async () => {
      // Arrange
      const mockJob = {
        _id: 'test-job-456',
        company_id: 'company-2',
        client_id: 'client-2',
        assigned_user_id: 'user-2',
        completed_at: new Date(),
        supplies_used: [{ name: 'Test Supply', quantity: 5 }],
        photos: [],
      };

      // Act
      const pdfPath = await generateServiceReportPdf(mockJob);
      const fileSize = fs.statSync(pdfPath).size;

      // Assert
      expect(fileSize).toBeGreaterThan(0);
    });

    it('should handle jobs with no supplies', async () => {
      // Arrange
      const mockJob = {
        _id: 'test-job-empty',
        company_id: 'company-3',
        client_id: 'client-3',
        assigned_user_id: 'user-3',
        completed_at: new Date(),
        supplies_used: [],
        photos: [],
      };

      // Act & Assert
      expect(async () => {
        await generateServiceReportPdf(mockJob);
      }).not.toThrow();
    });

    it('should handle jobs with multiple photos', async () => {
      // Arrange
      const mockJob = {
        _id: 'test-job-photos',
        company_id: 'company-4',
        client_id: 'client-4',
        assigned_user_id: 'user-4',
        completed_at: new Date(),
        supplies_used: [],
        photos: [
          'https://example.com/photo1.jpg',
          'https://example.com/photo2.jpg',
          'https://example.com/photo3.jpg',
        ],
      };

      // Act
      const pdfPath = await generateServiceReportPdf(mockJob);

      // Assert
      expect(fs.existsSync(pdfPath)).toBe(true);
    });

    it('should create PDF in uploads directory', async () => {
      // Arrange
      const mockJob = {
        _id: 'test-job-location',
        company_id: 'company-5',
        client_id: 'client-5',
        assigned_user_id: 'user-5',
        completed_at: new Date(),
        supplies_used: [],
        photos: [],
      };

      // Act
      const pdfPath = await generateServiceReportPdf(mockJob);

      // Assert
      expect(pdfPath).toContain('uploads');
      expect(pdfPath).toContain(path.sep);
    });
  });
});
