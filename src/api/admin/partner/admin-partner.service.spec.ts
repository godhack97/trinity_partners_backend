import { HttpException } from '@nestjs/common';
import { CompanyStatus } from '@orm/entities';
import AdminPartnerService from './admin-partner.service';

describe('AdminPartnerService company status transitions', () => {
  const companyRepository = {
    findOneBy: jest.fn(),
    update: jest.fn(),
  };
  const dealRepository = {};
  const companyEmployeeRepository = {
    findOneBy: jest.fn(),
    update: jest.fn(),
  };
  const userRepository = {
    update: jest.fn(),
    updateUser: jest.fn(),
    findById: jest.fn(),
  };
  const emailConfirmerService = { emailSend: jest.fn() };
  const notificationService = { send: jest.fn() };

  const service = new AdminPartnerService(
    companyRepository as any,
    dealRepository as any,
    companyEmployeeRepository as any,
    userRepository as any,
    emailConfirmerService as any,
    notificationService as any,
  );

  const company = (status: CompanyStatus) => ({
    id: 11,
    owner_id: 22,
    name: 'Тестовая компания',
    status,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    companyRepository.update.mockResolvedValue({ affected: 1 });
    companyEmployeeRepository.findOneBy.mockResolvedValue({ id: 33 });
    userRepository.findById.mockResolvedValue({ id: 22, email: 'owner@example.com' });
  });

  test.each([
    ['accept', CompanyStatus.Accept],
    ['reject', CompanyStatus.Accept],
    ['suspend', CompanyStatus.Pending],
  ])('rejects invalid %s transition before updates', async (method, status) => {
    companyRepository.findOneBy.mockResolvedValue(company(status));

    await expect(
      method === 'accept'
        ? service.accept(11, { id: 5 } as any)
        : (service as any)[method](11),
    ).rejects.toBeInstanceOf(HttpException);
    expect(companyRepository.update).not.toHaveBeenCalled();
  });

  test('restores only a rejected company and activates its owner', async () => {
    companyRepository.findOneBy.mockResolvedValue(company(CompanyStatus.Reject));

    await service.restore(11, { id: 5 } as any);

    expect(companyRepository.update).toHaveBeenCalledWith(
      11,
      expect.objectContaining({
        status: CompanyStatus.Accept,
        validated_by_manager_id: 5,
      }),
    );
    expect(userRepository.update).toHaveBeenCalledWith(22, {
      is_activated: true,
    });
    expect(companyEmployeeRepository.update).toHaveBeenCalledWith(33, {
      status: 'accept',
    });
    expect(notificationService.send).toHaveBeenCalled();
  });

  test('resumes only a suspended company', async () => {
    companyRepository.findOneBy.mockResolvedValue(company(CompanyStatus.Suspended));

    await service.resume(11, { id: 5 } as any);

    expect(companyRepository.update).toHaveBeenCalledWith(
      11,
      expect.objectContaining({ status: CompanyStatus.Accept }),
    );
  });

  test('does not use restore as resume', async () => {
    companyRepository.findOneBy.mockResolvedValue(company(CompanyStatus.Suspended));

    await expect(service.restore(11, { id: 5 } as any)).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(companyRepository.update).not.toHaveBeenCalled();
  });

  test('updates only reviewed company business fields and normalizes nullable values', async () => {
    companyRepository.findOneBy.mockResolvedValue(company(CompanyStatus.Accept));

    await service.updateBusinessFields(11, {
      name: '  Новое имя  ',
      partnership_type: 'distributor' as any,
      partner_level: null,
      certificate_expiry: '2027-12-31',
      email_domain: ' PARTNER.EXAMPLE.COM ',
      employees_count: 50,
    });

    expect(companyRepository.update).toHaveBeenCalledWith(11, {
      name: 'Новое имя',
      partnership_type: 'distributor',
      partner_level: null,
      certificate_expiry: new Date('2027-12-31T00:00:00.000Z'),
      email_domain: 'partner.example.com',
      employees_count: 50,
    });
  });

  test('returns not found before attempting a business field update', async () => {
    companyRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.updateBusinessFields(404, { name: 'Unknown' }),
    ).rejects.toMatchObject({ status: 404 });
    expect(companyRepository.update).not.toHaveBeenCalled();
  });
});
