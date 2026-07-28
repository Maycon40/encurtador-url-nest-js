import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

import { ShortenerService } from './shortener.service';
import { ShortenerRepository } from './shortener.repository';

describe('ShortenerService', () => {
  let service: ShortenerService;
  let repository: jest.Mocked<ShortenerRepository>;

  const mockShortenerRepository = () => ({
    findByCode: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    incrementClicks: jest.fn(),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-28T10:00:00.000Z'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShortenerService,
        {
          provide: ShortenerRepository,
          useFactory: mockShortenerRepository,
        },
      ],
    }).compile();

    service = module.get<ShortenerService>(ShortenerService);
    repository = module.get(ShortenerRepository);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
  });

  /* ========================================================================
   * METHOD: create
   * ======================================================================== */
  describe('create()', () => {
    const originalUrl = 'https://example.com';
    const baseUrl = 'https://short.url';

    it('should create and return a shortened link successfully', async () => {
      const mockCreatedLink = {
        code: 'abc12345',
        short_url: 'https://short.url/abc12345',
        original_url: originalUrl,
        clicks: 0,
        expires_at: new Date('2026-08-04T10:00:00.000Z'),
        created_at: new Date('2026-07-28T10:00:00.000Z'),
        updated_at: new Date('2026-07-28T10:00:00.000Z'),
      };

      repository.findByCode.mockResolvedValueOnce(null);
      repository.create.mockResolvedValueOnce(mockCreatedLink);

      const result = await service.create(originalUrl, baseUrl);

      expect(result).toEqual(mockCreatedLink);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.findByCode).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.create).toHaveBeenCalledTimes(1);
    });

    it('should throw InternalServerErrorException when failing to generate a unique code after max retries', async () => {
      const existingLink = {
        code: 'existing',
        short_url: 'https://short.url/existing',
        original_url: originalUrl,
        clicks: 0,
        expires_at: new Date('2026-08-04T10:00:00.000Z'),
        created_at: new Date('2026-07-28T10:00:00.000Z'),
        updated_at: new Date('2026-07-28T10:00:00.000Z'),
      };

      repository.findByCode.mockResolvedValue(existingLink);

      await expect(service.create(originalUrl, baseUrl)).rejects.toThrow(
        InternalServerErrorException,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.findByCode).toHaveBeenCalledTimes(5);
    });

    it('should retry generating a code if the first one already exists and succeed on second attempt', async () => {
      const mockCreatedLink = {
        code: 'xyz98765',
        short_url: 'https://short.url/xyz98765',
        original_url: originalUrl,
        clicks: 0,
        expires_at: new Date('2026-08-04T10:00:00.000Z'),
        created_at: new Date('2026-07-28T10:00:00.000Z'),
        updated_at: new Date('2026-07-28T10:00:00.000Z'),
      };

      repository.findByCode
        .mockResolvedValueOnce({ ...mockCreatedLink, code: 'collision' })
        .mockResolvedValueOnce(null);

      repository.create.mockResolvedValueOnce(mockCreatedLink);

      const result = await service.create(originalUrl, baseUrl);

      expect(result).toEqual(mockCreatedLink);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.findByCode).toHaveBeenCalledTimes(2);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.create).toHaveBeenCalledTimes(1);
    });
  });

  /* ========================================================================
   * METHOD: read
   * ======================================================================== */
  describe('read()', () => {
    const code = 'abc12345';
    const originalUrl = 'https://example.com';

    it('should return link record if it exists', async () => {
      const mockLink = {
        code,
        short_url: `https://short.url/${code}`,
        original_url: originalUrl,
        clicks: 0,
        expires_at: new Date('2026-08-04T10:00:00.000Z'),
        created_at: new Date('2026-07-28T10:00:00.000Z'),
        updated_at: new Date('2026-07-28T10:00:00.000Z'),
      };

      repository.findByCode.mockResolvedValueOnce(mockLink);

      const result = await service.read(code);

      expect(result).toEqual(mockLink);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.findByCode).toHaveBeenCalledWith(code);
    });

    it('should throw NotFoundException if code does not exist', async () => {
      repository.findByCode.mockResolvedValueOnce(null);

      await expect(service.read('non-existing-code')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  /* ========================================================================
   * METHOD: getRedirectUrl
   * ======================================================================== */
  describe('getRedirectUrl()', () => {
    const code = 'abc12345';
    const originalUrl = 'https://example.com';

    it('should return redirect URL and increment clicks if link is valid', async () => {
      const validLink = {
        code,
        short_url: `https://short.url/${code}`,
        original_url: originalUrl,
        clicks: 0,
        expires_at: new Date('2026-08-04T10:00:00.000Z'),
        created_at: new Date('2026-07-28T10:00:00.000Z'),
        updated_at: new Date('2026-07-28T10:00:00.000Z'),
      };

      repository.findByCode.mockResolvedValueOnce(validLink);

      const result = await service.getRedirectUrl(code);

      expect(result).toEqual({ redirect: originalUrl });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.incrementClicks).toHaveBeenCalledWith(code);
    });

    it('should throw BadRequestException if link is expired', async () => {
      const expiredLink = {
        code,
        short_url: `https://short.url/${code}`,
        original_url: originalUrl,
        clicks: 0,
        expires_at: new Date('2026-07-27T10:00:00.000Z'),
        created_at: new Date('2026-07-20T10:00:00.000Z'),
        updated_at: new Date('2026-07-20T10:00:00.000Z'),
      };

      repository.findByCode.mockResolvedValueOnce(expiredLink);

      await expect(service.getRedirectUrl(code)).rejects.toThrow(
        BadRequestException,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.incrementClicks).not.toHaveBeenCalled();
    });
  });

  /* ========================================================================
   * METHOD: update
   * ======================================================================== */
  describe('update()', () => {
    const code = 'abc12345';
    const newOriginalUrl = 'https://new-example.com';

    it('should update and return updated link on success', async () => {
      const mockCurrentLink = {
        code,
        short_url: `https://short.url/${code}`,
        original_url: 'https://example.com',
        clicks: 5,
        expires_at: new Date('2026-08-04T10:00:00.000Z'),
        created_at: new Date('2026-07-28T10:00:00.000Z'),
        updated_at: new Date('2026-07-28T10:00:00.000Z'),
      };

      const mockUpdatedLink = {
        ...mockCurrentLink,
        original_url: newOriginalUrl,
      };

      repository.findByCode.mockResolvedValueOnce(mockCurrentLink);
      repository.update.mockResolvedValueOnce(mockUpdatedLink);

      const result = await service.update(
        { original_url: newOriginalUrl },
        code,
      );

      expect(result).toEqual(mockUpdatedLink);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.update).toHaveBeenCalledWith(code, {
        code,
        short_url: mockCurrentLink.short_url,
        original_url: newOriginalUrl,
        expires_at: mockCurrentLink.expires_at,
      });
    });

    it('should throw NotFoundException if link to update is not found', async () => {
      repository.findByCode.mockResolvedValueOnce(null);

      await expect(
        service.update({ original_url: newOriginalUrl }, 'non-existing-code'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  /* ========================================================================
   * METHOD: delete
   * ======================================================================== */
  describe('delete()', () => {
    const code = 'abc12345';

    it('should delete link and return details on success', async () => {
      const mockLink = {
        code,
        short_url: `https://short.url/${code}`,
        original_url: 'https://example.com',
        clicks: 2,
        expires_at: new Date('2026-08-04T10:00:00.000Z'),
        created_at: new Date('2026-07-28T10:00:00.000Z'),
        updated_at: new Date('2026-07-28T10:00:00.000Z'),
      };

      repository.findByCode.mockResolvedValueOnce(mockLink);
      repository.delete.mockResolvedValueOnce(mockLink);

      const result = await service.delete(code);

      expect(result).toEqual({
        code: mockLink.code,
        original_url: mockLink.original_url,
        short_url: mockLink.short_url,
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.delete).toHaveBeenCalledWith(code);
    });

    it('should throw NotFoundException if link to delete is not found', async () => {
      repository.findByCode.mockResolvedValueOnce(null);

      await expect(service.delete('non-existing-code')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  /* ========================================================================
   * METHOD: statistics
   * ======================================================================== */
  describe('statistics()', () => {
    const code = 'abc12345';

    it('should return link metrics on success', async () => {
      const mockStatsData = {
        code,
        short_url: `https://short.url/${code}`,
        original_url: 'https://example.com',
        clicks: 42,
        expires_at: new Date('2026-08-04T10:00:00.000Z'),
        updated_at: new Date('2026-07-28T10:00:00.000Z'),
        created_at: new Date('2026-07-28T10:00:00.000Z'),
      };

      repository.findByCode.mockResolvedValueOnce(mockStatsData);

      const result = await service.statistics(code);

      expect(result).toEqual(mockStatsData);
    });

    it('should throw NotFoundException if link for statistics is not found', async () => {
      repository.findByCode.mockResolvedValueOnce(null);

      await expect(service.statistics('non-existing-code')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
