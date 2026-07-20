import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { TicketsController } from "@api/tickets/tickets.controller";
import { TicketsService } from "@api/tickets/tickets.service";

describe("Tickets controller HTTP contracts", () => {
  let app: INestApplication;

  const ticketsService = {
    findAll: jest.fn(),
    getCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    addMessage: jest.fn(),
    markAsRead: jest.fn(),
    close: jest.fn(),
    reopen: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [{ provide: TicketsService, useValue: ticketsService }],
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

  it("rejects malformed resource ids before calling the service", async () => {
    await request(app.getHttpServer())
      .get("/api/tickets/not-an-id")
      .expect(400);
    await request(app.getHttpServer())
      .post("/api/tickets/not-an-id/messages")
      .send({ message: "Тест" })
      .expect(400);
    await request(app.getHttpServer())
      .patch("/api/tickets/not-an-id/read")
      .expect(400);
    await request(app.getHttpServer())
      .patch("/api/tickets/not-an-id/close")
      .expect(400);
    await request(app.getHttpServer())
      .patch("/api/tickets/not-an-id/reopen")
      .expect(400);

    expect(ticketsService.findOne).not.toHaveBeenCalled();
    expect(ticketsService.addMessage).not.toHaveBeenCalled();
    expect(ticketsService.markAsRead).not.toHaveBeenCalled();
    expect(ticketsService.close).not.toHaveBeenCalled();
    expect(ticketsService.reopen).not.toHaveBeenCalled();
  });
});
