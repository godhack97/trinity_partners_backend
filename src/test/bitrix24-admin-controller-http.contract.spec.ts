import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { Bitrix24AdminController } from "@integrations/bitrix24/bitrix24-admin.controller";
import { Bitrix24QueueService } from "@integrations/bitrix24/bitrix24-queue.service";
import { Bitrix24Service } from "@integrations/bitrix24/bitrix24.service";

describe("Bitrix24 admin controller HTTP contracts", () => {
  let app: INestApplication;

  const queueService = {
    forceResyncAllFailed: jest.fn(),
    cleanupOldSyncData: jest.fn(),
    syncPendingLeads: jest.fn(),
  };
  const bitrix24Service = {};

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [Bitrix24AdminController],
      providers: [
        { provide: Bitrix24QueueService, useValue: queueService },
        { provide: Bitrix24Service, useValue: bitrix24Service },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.listen(0, "127.0.0.1");
  });

  beforeEach(() => {
    jest.clearAllMocks();
    queueService.forceResyncAllFailed.mockResolvedValue({
      success: 2,
      failed: 0,
    });
    queueService.cleanupOldSyncData.mockResolvedValue(3);
    queueService.syncPendingLeads.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ["/api/admin/bitrix24/sync/force-all", "forceResyncAllFailed"],
    ["/api/admin/bitrix24/sync/cleanup", "cleanupOldSyncData"],
    ["/api/admin/bitrix24/sync/run-now", "syncPendingLeads"],
  ])("requires confirm=true for %s", async (endpoint, serviceMethod) => {
    await request(app.getHttpServer()).post(endpoint).send({}).expect(400);
    await request(app.getHttpServer())
      .post(endpoint)
      .send({ confirm: false })
      .expect(400);
    await request(app.getHttpServer())
      .post(endpoint)
      .send({ confirm: "true" })
      .expect(400);

    expect(queueService[serviceMethod]).not.toHaveBeenCalled();
  });

  it("runs confirmed bulk operations with an explicit 200 response", async () => {
    await request(app.getHttpServer())
      .post("/api/admin/bitrix24/sync/force-all")
      .send({ confirm: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(expect.objectContaining({ success: 2, failed: 0 }));
      });
    await request(app.getHttpServer())
      .post("/api/admin/bitrix24/sync/cleanup")
      .send({ confirm: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(expect.objectContaining({ cleaned: 3 }));
      });
    await request(app.getHttpServer())
      .post("/api/admin/bitrix24/sync/run-now")
      .send({ confirm: true })
      .expect(200);

    expect(queueService.forceResyncAllFailed).toHaveBeenCalledTimes(1);
    expect(queueService.cleanupOldSyncData).toHaveBeenCalledTimes(1);
    expect(queueService.syncPendingLeads).toHaveBeenCalledTimes(1);
  });

  it("returns 501 for the unimplemented bulk conversion stub", async () => {
    await request(app.getHttpServer())
      .post("/api/admin/bitrix24/leads/bulk-convert")
      .expect(501)
      .expect(({ body }) => {
        expect(body.message).toContain("не реализована");
      });
  });
});
