import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { AdminPartnerController } from "@api/admin/partner/admin-partner.controller";
import AdminPartnerService from "@api/admin/partner/admin-partner.service";

describe("Legacy admin partner transition HTTP contracts", () => {
  let app: INestApplication;
  const partnerService = {
    accept: jest.fn(),
    reject: jest.fn(),
    suspend: jest.fn(),
    restore: jest.fn(),
    resume: jest.fn(),
    getCountByStatus: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminPartnerController],
      providers: [{ provide: AdminPartnerService, useValue: partnerService }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.listen(0, "127.0.0.1");
  });

  afterAll(async () => app.close());

  it.each(["accept", "reject", "suspend", "restore", "resume"])(
    "returns 410 for removed legacy %s workflow",
    async (operation) => {
      await request(app.getHttpServer())
        .post(`/api/admin/partner/11/${operation}`)
        .expect(410);

      expect(partnerService[operation]).not.toHaveBeenCalled();
    },
  );

  it("returns 400 for a malformed legacy path id", async () => {
    await request(app.getHttpServer())
      .post("/api/admin/partner/not-an-id/accept")
      .expect(400);
  });

  it("keeps the transitional rejected count at zero without querying legacy state", async () => {
    await request(app.getHttpServer())
      .get("/api/admin/partner/count/rejected")
      .expect(200)
      .expect("0");
    expect(partnerService.getCountByStatus).not.toHaveBeenCalled();
  });
});
