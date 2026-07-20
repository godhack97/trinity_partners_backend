import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserTableSettingsController } from './user-table-settings.controller';

describe('UserTableSettingsController ownership', () => {
  const settings = {
    id: 1,
    userId: 7,
    tableId: 'deals',
    data: ['email'],
  } as any;

  const service = {
    findByUserAndTable: jest.fn(),
    save: jest.fn(),
  };

  const controller = new UserTableSettingsController(service as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns settings only for the authenticated owner', async () => {
    service.findByUserAndTable.mockResolvedValue(settings);

    await expect(
      controller.getUserTableSettings(7, 'deals', { id: 7 } as any),
    ).resolves.toBe(settings);
    expect(service.findByUserAndTable).toHaveBeenCalledWith(7, 'deals');
  });

  test('rejects reading another user settings before repository access', async () => {
    await expect(
      controller.getUserTableSettings(7, 'deals', { id: 8 } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.findByUserAndTable).not.toHaveBeenCalled();
  });

  test('rejects writing another user settings before repository access', async () => {
    await expect(
      controller.upsertUserTableSettings(
        7,
        'deals',
        { data: ['email'] },
        { id: 8 } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.save).not.toHaveBeenCalled();
  });

  test('keeps the existing not-found contract for the owner', async () => {
    service.findByUserAndTable.mockResolvedValue(undefined);

    await expect(
      controller.getUserTableSettings(7, 'missing', { id: 7 } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
