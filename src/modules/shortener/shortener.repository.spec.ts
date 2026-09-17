import { Test, TestingModule } from '@nestjs/testing';
import { ShortenerRepository, Link } from './shortener.repository';
import database from '../../core/database';

jest.mock('../infra/database', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

describe('ShortenerRepository', () => {
  let repository: ShortenerRepository;
  const mockDatabaseQuery = database.query as jest.Mock;

  const mockLink: Link = {
    code: 'abc1234',
    original_url: 'https://example.com',
    short_url: 'https://short.url/abc1234',
    expires_at: new Date('2026-12-31T23:59:59.000Z'),
    clicks: 0,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ShortenerRepository],
    }).compile();

    repository = module.get<ShortenerRepository>(ShortenerRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByCode', () => {
    it('should return a link when found', async () => {
      mockDatabaseQuery.mockResolvedValueOnce({ rows: [mockLink] });

      const result = await repository.findByCode('abc1234');

      expect(result).toEqual(mockLink);
      expect(mockDatabaseQuery).toHaveBeenCalledWith({
        text: 'SELECT * FROM links WHERE code = $1',
        values: ['abc1234'],
      });
    });

    it('should return null when link is not found', async () => {
      mockDatabaseQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.findByCode('notfound');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should insert and return the newly created link', async () => {
      mockDatabaseQuery.mockResolvedValueOnce({ rows: [mockLink] });

      const result = await repository.create(mockLink);

      expect(result).toEqual(mockLink);
      expect(mockDatabaseQuery).toHaveBeenCalledWith({
        text: 'INSERT INTO links (code, short_url, original_url, expires_at) VALUES ($1, $2, $3, $4) RETURNING *',
        values: [
          mockLink.code,
          mockLink.short_url,
          mockLink.original_url,
          mockLink.expires_at,
        ],
      });
    });

    it('should return null when link is not created', async () => {
      mockDatabaseQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.create(mockLink);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update and return the updated link', async () => {
      const updatedLink = { ...mockLink, original_url: 'https://newurl.com' };
      mockDatabaseQuery.mockResolvedValueOnce({ rows: [updatedLink] });

      const result = await repository.update('abc1234', updatedLink);

      expect(result).toEqual(updatedLink);
      expect(mockDatabaseQuery).toHaveBeenCalledWith({
        text: `
        UPDATE
          links
        SET
          original_url = $2,
          expires_at = $3,
          code = $4,
          short_url = $5,
          updated_at = timezone('utc', now())
        WHERE
          code = $1
        RETURNING
          *
        ;`,
        values: [
          'abc1234',
          updatedLink.original_url,
          updatedLink.expires_at,
          updatedLink.code,
          updatedLink.short_url,
        ],
      });
    });

    it('should return null when link is not updated', async () => {
      mockDatabaseQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.update('abc1234', mockLink);

      expect(result).toBeNull();
    });
  });

  describe('incrementClicks', () => {
    it('should execute update query to increment clicks', async () => {
      mockDatabaseQuery.mockResolvedValueOnce({ rows: [] });

      await repository.incrementClicks('abc1234');

      expect(mockDatabaseQuery).toHaveBeenCalledWith({
        text: 'UPDATE links SET clicks = clicks + 1 WHERE code = $1',
        values: ['abc1234'],
      });
    });
  });

  describe('delete', () => {
    it('should delete and return the deleted link', async () => {
      mockDatabaseQuery.mockResolvedValueOnce({ rows: [mockLink] });

      const result = await repository.delete('abc1234');

      expect(result).toEqual(mockLink);
      expect(mockDatabaseQuery).toHaveBeenCalledWith({
        text: 'DELETE FROM links WHERE code = $1 RETURNING *',
        values: ['abc1234'],
      });
    });

    it('should return null if code to delete does not exist', async () => {
      mockDatabaseQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repository.delete('notfound');

      expect(result).toBeNull();
    });
  });
});
