import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { AdminPartnerController } from "@api/admin/partner/admin-partner.controller";
import AdminPartnerService from "@api/admin/partner/admin-partner.service";
import { AdminUserController } from "@api/admin/user/admin-user.controller";
import { AdminUserService } from "@api/admin/user/admin-user.service";
import { AdminDealController } from "@api/admin/deal/admin-deal.controller";
import { AdminDealService } from "@api/admin/deal/admin-deal.service";
import { AdminConfiguratorComponentController } from "@api/admin/configurator/component/admin-configurator-component.controller";
import { AdminConfiguratorComponentService } from "@api/admin/configurator/component/admin-configurator-component.service";
import { XlsxService } from "@api/admin/configurator/component/xlsx.service";
import { DealDuplicateReviewStatus } from "@orm/entities";

describe("Admin controller HTTP contracts", () => {
  let app: INestApplication;

  const partnerService = {
    updateBusinessFields: jest.fn(),
  };
  const userService = {
    find: jest.fn(),
    restoreCompanyEmployee: jest.fn(),
  };
  const dealService = {
    update: jest.fn(),
    reviewDuplicate: jest.fn(),
  };
  const componentService = {
    getComponentProfiles: jest.fn(),
    upsertComponentProfiles: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        AdminPartnerController,
        AdminUserController,
        AdminDealController,
        AdminConfiguratorComponentController,
      ],
      providers: [
        { provide: AdminPartnerService, useValue: partnerService },
        { provide: AdminUserService, useValue: userService },
        { provide: AdminDealService, useValue: dealService },
        {
          provide: AdminConfiguratorComponentService,
          useValue: componentService,
        },
        { provide: XlsxService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.listen(0, "127.0.0.1");
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("partner business fields", () => {
    const endpoint = "/api/admin/partner/21";

    it("returns the handler response and transforms numeric fields", async () => {
      const responseBody = {
        id: 21,
        name: "Acme Systems",
        employees_count: 12,
      };
      partnerService.updateBusinessFields.mockResolvedValueOnce(responseBody);

      await request(app.getHttpServer())
        .patch(endpoint)
        .send({ name: "Acme Systems", employees_count: "12" })
        .expect(200)
        .expect(responseBody);

      expect(partnerService.updateBusinessFields).toHaveBeenCalledWith(
        21,
        expect.objectContaining({
          name: "Acme Systems",
          employees_count: 12,
        }),
      );
    });

    it("rejects malformed ids and non-whitelisted lifecycle fields", async () => {
      await request(app.getHttpServer())
        .patch("/api/admin/partner/not-an-id")
        .send({ name: "Acme Systems" })
        .expect(400);

      await request(app.getHttpServer())
        .patch(endpoint)
        .send({ status: "accept" })
        .expect(400);

      expect(partnerService.updateBusinessFields).not.toHaveBeenCalled();
    });

    it("preserves a service-level 404", async () => {
      partnerService.updateBusinessFields.mockRejectedValueOnce(
        new NotFoundException("Компания не найдена"),
      );

      await request(app.getHttpServer())
        .patch(endpoint)
        .send({ name: "Acme Systems" })
        .expect(404)
        .expect(({ body }) => {
          expect(body.message).toBe("Компания не найдена");
        });
    });
  });

  describe("admin users", () => {
    it("validates and transforms list filters", async () => {
      const responseBody = {
        data: [{ id: 7, email: "employee@example.test" }],
        total: 1,
        current_page: 2,
        limit: 25,
      };
      userService.find.mockResolvedValueOnce(responseBody);

      await request(app.getHttpServer())
        .get("/api/admin/user?current_page=2&limit=25&role_name=employee")
        .expect(200)
        .expect(responseBody);

      expect(userService.find).toHaveBeenCalledWith(
        expect.objectContaining({
          current_page: 2,
          limit: 25,
          role_name: "employee",
        }),
      );
    });

    it("returns 400 for invalid pagination and restore ids", async () => {
      await request(app.getHttpServer())
        .get("/api/admin/user?current_page=0")
        .expect(400);

      await request(app.getHttpServer())
        .post("/api/admin/user/not-an-id/restore-employee")
        .expect(400);

      expect(userService.find).not.toHaveBeenCalled();
      expect(userService.restoreCompanyEmployee).not.toHaveBeenCalled();
    });

    it("returns success and service-level 404 for employee restore", async () => {
      userService.restoreCompanyEmployee.mockResolvedValueOnce({
        id: 31,
        status: "accept",
      });

      await request(app.getHttpServer())
        .post("/api/admin/user/31/restore-employee")
        .expect(201)
        .expect({ id: 31, status: "accept" });
      expect(userService.restoreCompanyEmployee).toHaveBeenCalledWith(31);

      userService.restoreCompanyEmployee.mockRejectedValueOnce(
        new NotFoundException("Сотрудник не найден"),
      );
      await request(app.getHttpServer())
        .post("/api/admin/user/999/restore-employee")
        .expect(404);
    });
  });

  describe("deal duplicate review", () => {
    const endpoint = "/api/admin/deals/44/duplicate-review";

    it("rejects a non-final status before calling the service", async () => {
      await request(app.getHttpServer())
        .patch(endpoint)
        .send({ status: "pending" })
        .expect(400);

      expect(dealService.reviewDuplicate).not.toHaveBeenCalled();
    });

    it("returns success and service-level 404", async () => {
      const status = DealDuplicateReviewStatus.NotDuplicate;
      dealService.reviewDuplicate.mockResolvedValueOnce({ id: 44, status });

      await request(app.getHttpServer())
        .patch(endpoint)
        .send({ status })
        .expect(200)
        .expect({ id: 44, status });
      expect(dealService.reviewDuplicate).toHaveBeenCalledWith(44, status);

      dealService.reviewDuplicate.mockRejectedValueOnce(
        new NotFoundException("Сделка не найдена"),
      );
      await request(app.getHttpServer())
        .patch("/api/admin/deals/999/duplicate-review")
        .send({ status })
        .expect(404);
    });
  });

  describe("configurator component profiles", () => {
    const endpoint = "/api/admin/configurator/component/cpu-1/profiles";
    const profiles = {
      catalog: { component_type_key: "cpu" },
      cpu: { ram_type: "DDR5" },
    };

    it("returns profiles and preserves a read 404", async () => {
      componentService.getComponentProfiles.mockResolvedValueOnce(profiles);
      await request(app.getHttpServer())
        .get(endpoint)
        .expect(200)
        .expect(profiles);
      expect(componentService.getComponentProfiles).toHaveBeenCalledWith(
        "cpu-1",
      );

      componentService.getComponentProfiles.mockRejectedValueOnce(
        new NotFoundException("Компонент не найден"),
      );
      await request(app.getHttpServer())
        .get("/api/admin/configurator/component/missing/profiles")
        .expect(404);
    });

    it("validates nested profiles and returns the handler response", async () => {
      componentService.upsertComponentProfiles.mockResolvedValueOnce(profiles);

      await request(app.getHttpServer())
        .post(endpoint)
        .send(profiles)
        .expect(201)
        .expect(profiles);
      expect(componentService.upsertComponentProfiles).toHaveBeenCalledWith(
        "cpu-1",
        expect.objectContaining({
          catalog: expect.objectContaining({ component_type_key: "cpu" }),
          cpu: expect.objectContaining({ ram_type: "DDR5" }),
        }),
      );

      componentService.upsertComponentProfiles.mockClear();
      await request(app.getHttpServer())
        .post(endpoint)
        .send({ cpu: { ram_type: 5 }, unknown_profile: {} })
        .expect(400);
      expect(componentService.upsertComponentProfiles).not.toHaveBeenCalled();
    });
  });
});
