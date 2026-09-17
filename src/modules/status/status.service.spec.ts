import { Test, TestingModule } from '@nestjs/testing';

import database from '../../core/database';
import { StatusService } from './status.service';

jest.mock('../../core/database', () => ({
  query: jest.fn(),
}));

describe('StatusService', () => {
  let service: StatusService;
  const mockedDatabaseQuery = database.query as jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-28T10:00:00.000Z'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [StatusService],
    }).compile();

    service = module.get<StatusService>(StatusService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('healthCheck()', () => {
    it('should return the health status online when all dependencies are online', async () => {
      mockedDatabaseQuery
        .mockResolvedValueOnce({ rows: [{ server_version: '16.0.0' }] })
        .mockResolvedValueOnce({ rows: [{ max_connections: '100' }] })
        .mockResolvedValueOnce({ rows: [{ count: 1 }] });

      const result = await service.healthCheck();

      expect(result).toEqual({
        updated_at: '2026-07-28T10:00:00.000Z',
        dependencies: {
          status: 'online',
          version: '16.0.0',
          max_connections: 100,
          used_connections: 1,
        },
      });
    });

    it('should return the health status offline when any dependency is offline', async () => {
      mockedDatabaseQuery
        .mockResolvedValueOnce({ rows: [{ server_version: null }] })
        .mockResolvedValueOnce({ rows: [{ max_connections: '100' }] })
        .mockResolvedValueOnce({ rows: [{ count: 1 }] });

      const result = await service.healthCheck();

      expect(result).toEqual({
        updated_at: '2026-07-28T10:00:00.000Z',
        dependencies: {
          status: 'offline',
          version: null,
          max_connections: 100,
          used_connections: 1,
        },
      });
    });
  });
});
