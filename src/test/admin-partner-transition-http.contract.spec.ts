import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { AdminPartnerController } from "@api/admin/partner/admin-partner.controller";
import AdminPartnerService from "@api/admin/partner/admin-partner.service";
import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { NotificationService } from "@api/notification/notification.service";
import {
  CompanyEmployeeRepository,
  CompanyRepository,
  DealRepository,
  UserRepository,
} from "@orm/repositories";
import { CompanyEmployeeStatus, CompanyStatus } from "@orm/entities";

describe("Admin partner transition HTTP contracts", () => {
  let app: INestApplication;
  let status: CompanyStatus;

  const adminQueryBuilder = {
    distinct: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  const companyRepository = {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
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
    createQueryBuilder: jest.fn().mockReturnValue(adminQueryBuilder),
  };
  const emailConfirmerService = {
    emailSend: jest.fn(),
  };
  const notificationService = {
    send: jest.fn(),
  };

  const company = () => ({
    id: 11,
    owner_id: 22,
    name: "Тестовая компания",
    status,
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminPartnerController],
      providers: [
        AdminPartnerService,
        { provide: CompanyRepository, useValue: companyRepository },
        { provide: DealRepository, useValue: dealRepository },
        {
          provide: CompanyEmployeeRepository,
          useValue: companyEmployeeRepository,
        },
        { provide: UserRepository, useValue: userRepository },
        { provide: EmailConfirmerService, useValue: emailConfirmerService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use((req: any, _res: any, next: () => void) => {
      const authUser = { id: 5 };
      req.user = authUser;
      req.auth_user = authUser;
      next();
    });
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.listen(0, "127.0.0.1");
  });

  beforeEach(() => {
    jest.clearAllMocks();
    status = CompanyStatus.Pending;
    companyRepository.findOneBy.mockImplementation(async () => company());
    companyRepository.findOne.mockImplementation(async () => ({
      ...company(),
      owner: {
        id: 22,
        email: "owner@example.test",
        manager: null,
      },
      validated_by_manager: {
        id: 5,
        email: "manager@example.test",
        user_info: { first_name: "Иван", last_name: "Иванов" },
      },
    }));
    companyRepository.update.mockResolvedValue({ affected: 1 });
    companyEmployeeRepository.findOneBy.mockResolvedValue({ id: 33 });
    companyEmployeeRepository.update.mockResolvedValue({ affected: 1 });
    userRepository.update.mockResolvedValue({ affected: 1 });
    userRepository.updateUser.mockResolvedValue({ affected: 1 });
    userRepository.findById.mockResolvedValue({
      id: 22,
      email: "owner@example.test",
    });
    userRepository.createQueryBuilder.mockReturnValue(adminQueryBuilder);
    adminQueryBuilder.getMany.mockResolvedValue([]);
    emailConfirmerService.emailSend.mockResolvedValue(undefined);
    notificationService.send.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  const endpoint = (operation: string, id: string | number = 11) =>
    `/api/admin/partner/${id}/${operation}`;

  it("accepts a pending company and invokes both notification adapters", async () => {
    await request(app.getHttpServer()).post(endpoint("accept")).expect(201);

    expect(companyRepository.update).toHaveBeenCalledWith(
      11,
      expect.objectContaining({
        status: CompanyStatus.Accept,
        validated_by_manager_id: 5,
        validated_at: expect.any(Date),
      }),
    );
    expect(userRepository.updateUser).toHaveBeenCalledWith(22, {
      is_activated: true,
      manager_id: 5,
    });
    expect(companyEmployeeRepository.update).toHaveBeenCalledWith(33, {
      status: CompanyEmployeeStatus.Accept,
    });
    expect(emailConfirmerService.emailSend).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "owner@example.test",
        template: "request-company-approve",
      }),
    );
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 22, title: "Компания подтверждена" }),
    );
  });

  it("rejects a pending company and deactivates its owner", async () => {
    await request(app.getHttpServer()).post(endpoint("reject")).expect(201);

    expect(companyRepository.update).toHaveBeenCalledWith(11, {
      status: CompanyStatus.Reject,
    });
    expect(userRepository.update).toHaveBeenCalledWith(22, {
      is_activated: false,
    });
    expect(companyEmployeeRepository.update).toHaveBeenCalledWith(33, {
      status: CompanyEmployeeStatus.Reject,
    });
    expect(emailConfirmerService.emailSend).toHaveBeenCalledWith(
      expect.objectContaining({ template: "request-company-reject" }),
    );
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 22, title: "Партнёрство отклонено" }),
    );
  });

  it("suspends an accepted company without using the reject status", async () => {
    status = CompanyStatus.Accept;

    await request(app.getHttpServer()).post(endpoint("suspend")).expect(201);

    expect(companyRepository.update).toHaveBeenCalledWith(11, {
      status: CompanyStatus.Suspended,
    });
    expect(userRepository.update).toHaveBeenCalledWith(22, {
      is_activated: false,
    });
    expect(emailConfirmerService.emailSend).toHaveBeenCalledWith(
      expect.objectContaining({ template: "company-access-limited" }),
    );
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 22,
        title: "Партнёрство приостановлено",
      }),
    );
  });

  it.each([
    ["restore", CompanyStatus.Reject, "Партнёрство восстановлено"],
    ["resume", CompanyStatus.Suspended, "Доступ компании возобновлён"],
  ] as const)(
    "%s reactivates only its matching company state",
    async (operation, initialStatus, notificationTitle) => {
      status = initialStatus;

      await request(app.getHttpServer()).post(endpoint(operation)).expect(201);

      expect(companyRepository.update).toHaveBeenCalledWith(
        11,
        expect.objectContaining({
          status: CompanyStatus.Accept,
          validated_by_manager_id: 5,
          validated_at: expect.any(Date),
        }),
      );
      expect(userRepository.update).toHaveBeenCalledWith(22, {
        is_activated: true,
      });
      expect(emailConfirmerService.emailSend).toHaveBeenCalledWith(
        expect.objectContaining({ template: "request-company-approve" }),
      );
      expect(notificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 22, title: notificationTitle }),
      );
    },
  );

  it.each([
    ["accept", CompanyStatus.Accept],
    ["reject", CompanyStatus.Accept],
    ["suspend", CompanyStatus.Pending],
    ["restore", CompanyStatus.Suspended],
    ["resume", CompanyStatus.Reject],
  ] as const)(
    "returns 400 for an invalid %s transition before side effects",
    async (operation, initialStatus) => {
      status = initialStatus;

      await request(app.getHttpServer()).post(endpoint(operation)).expect(400);

      expect(companyRepository.update).not.toHaveBeenCalled();
      expect(userRepository.update).not.toHaveBeenCalled();
      expect(userRepository.updateUser).not.toHaveBeenCalled();
      expect(emailConfirmerService.emailSend).not.toHaveBeenCalled();
      expect(notificationService.send).not.toHaveBeenCalled();
    },
  );

  it.each(["accept", "reject", "suspend", "restore", "resume"])(
    "returns 404 when %s targets an unknown company",
    async (operation) => {
      companyRepository.findOneBy.mockResolvedValueOnce(null);

      await request(app.getHttpServer()).post(endpoint(operation)).expect(404);

      expect(companyRepository.update).not.toHaveBeenCalled();
      expect(emailConfirmerService.emailSend).not.toHaveBeenCalled();
      expect(notificationService.send).not.toHaveBeenCalled();
    },
  );

  it("returns 400 for a malformed path id before repository access", async () => {
    await request(app.getHttpServer())
      .post(endpoint("accept", "not-an-id"))
      .expect(400);

    expect(companyRepository.findOneBy).not.toHaveBeenCalled();
  });
});
