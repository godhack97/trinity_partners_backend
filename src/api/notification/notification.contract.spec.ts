import { HTTP_CODE_METADATA } from "@nestjs/common/constants";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { NotificationsReadDto } from "./dto/notifications-read.dto";
import { NotificationsResponseDto } from "./dto/notifications.response.dto";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { NotificationType } from "@orm/entities";

describe("notification contract", () => {
  it("accepts unique positive integer ids and rejects unsafe read payloads", async () => {
    const valid = plainToInstance(NotificationsReadDto, { ids: [1, 2] });
    const duplicate = plainToInstance(NotificationsReadDto, { ids: [1, 1] });
    const invalid = plainToInstance(NotificationsReadDto, { ids: [0, 1.5] });

    expect(await validate(valid)).toHaveLength(0);
    expect((await validate(duplicate)).length).toBeGreaterThan(0);
    expect((await validate(invalid)).length).toBeGreaterThan(0);
  });

  it("publishes grouped fields and returns HTTP 200 after marking records read", () => {
    const response = plainToInstance(
      NotificationsResponseDto,
      {
        id: 3,
        user_id: 42,
        title: "Ticket",
        text: "Updated",
        type: "site",
        is_read: false,
        icon: "bell",
        category: "system",
        read_at: null,
        actions: [{ label: "Open", url: "/service?ticketId=1" }],
        ticket_id: 1,
        created_at: new Date(),
        updated_at: new Date(),
        related: [{ id: 2, title: "Previous", text: "Old" }],
        internal_only: "must not leak",
      },
      { strategy: "excludeAll" },
    );

    expect(response.related?.[0].id).toBe(2);
    expect(response.actions?.[0]).toEqual(expect.objectContaining({ label: "Open" }));
    expect((response as any).internal_only).toBeUndefined();
    expect(
      Reflect.getMetadata(
        HTTP_CODE_METADATA,
        NotificationController.prototype.readList,
      ),
    ).toBe(200);
  });

  it("groups ticket notifications and sorts the resulting feed by newest id", async () => {
    const notificationRepository: any = {
      findBy: jest.fn().mockResolvedValue([
        { id: 5, ticket_id: 7, title: "new" },
        { id: 4, ticket_id: null, title: "standalone" },
        { id: 3, ticket_id: 7, title: "old" },
      ]),
    };
    const service = new NotificationService(
      {} as any,
      {} as any,
      notificationRepository,
      {} as any,
      {} as any,
    );

    await expect(service.getAll(42)).resolves.toEqual([
      expect.objectContaining({
        id: 5,
        related: [expect.objectContaining({ id: 3 })],
      }),
      expect.objectContaining({ id: 4 }),
    ]);
    expect(notificationRepository.findBy).toHaveBeenCalledWith({ user_id: 42 });
  });

  it("marks only notifications owned by the authenticated user", async () => {
    const execute = jest.fn();
    const getMany = jest.fn().mockResolvedValue([{ id: 9, user_id: 42 }]);
    const updateBuilder: any = {
      update: jest.fn(),
      set: jest.fn(),
      where: jest.fn(),
      execute,
    };
    updateBuilder.update.mockReturnValue(updateBuilder);
    updateBuilder.set.mockReturnValue(updateBuilder);
    updateBuilder.where.mockReturnValue(updateBuilder);

    const selectBuilder: any = {
      where: jest.fn(),
      orderBy: jest.fn(),
      getMany,
    };
    selectBuilder.where.mockReturnValue(selectBuilder);
    selectBuilder.orderBy.mockReturnValue(selectBuilder);

    const notificationRepository: any = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(updateBuilder)
        .mockReturnValueOnce(selectBuilder),
    };
    const service = new NotificationService(
      {} as any,
      {} as any,
      notificationRepository,
      {} as any,
      {} as any,
    );

    await expect(service.readList(42, { ids: [9] })).resolves.toEqual([
      { id: 9, user_id: 42 },
    ]);
    expect(updateBuilder.where).toHaveBeenCalledWith({
      id: expect.anything(),
      user_id: 42,
    });
    expect(selectBuilder.where).toHaveBeenCalledWith({
      id: expect.anything(),
      user_id: 42,
    });
  });

  it("does not duplicate a site notification with the same delivery key", async () => {
    const existing = { id: 11, delivery_key: "company:event:user:site" };
    const notificationRepository: any = {
      findOneBy: jest.fn().mockResolvedValue(existing),
      save: jest.fn(),
    };
    const service = new NotificationService(
      {} as any,
      {} as any,
      notificationRepository,
      {} as any,
      {} as any,
    );

    await expect(
      service.sendWeb({
        user_id: 42,
        title: "Статус",
        text: "Доступ восстановлен",
        type: NotificationType.Site,
        delivery_key: "company:event:user:site",
      }),
    ).resolves.toBe(existing);
    expect(notificationRepository.save).not.toHaveBeenCalled();
  });

  it("handles a concurrent delivery-key insert idempotently", async () => {
    const existing = { id: 12, delivery_key: "company:race:user:site" };
    const notificationRepository: any = {
      findOneBy: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existing),
      save: jest.fn().mockRejectedValue({ code: "ER_DUP_ENTRY" }),
    };
    const service = new NotificationService(
      {} as any,
      {} as any,
      notificationRepository,
      {} as any,
      {} as any,
    );

    await expect(
      service.sendWeb({
        user_id: 42,
        title: "Статус",
        text: "Доступ восстановлен",
        type: NotificationType.Site,
        delivery_key: "company:race:user:site",
      }),
    ).resolves.toBe(existing);
  });
});
