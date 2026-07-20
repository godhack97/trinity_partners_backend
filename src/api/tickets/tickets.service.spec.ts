import { HttpStatus } from "@nestjs/common";
import { RoleTypes } from "@app/types/RoleTypes";
import { UserEntity } from "@orm/entities";
import { TicketsService } from "./tickets.service";

const userWithRoles = (
  id: number,
  primaryRole: RoleTypes,
  secondaryRoles: RoleTypes[] = [],
) =>
  ({
    id,
    manager_id: 99,
    role: { name: primaryRole },
    roles: secondaryRoles.map((name) => ({ name })),
  }) as UserEntity;

describe("TicketsService handler roles", () => {
  const ticketRepository = {
    findById: jest.fn(),
    findByCreatorId: jest.fn(),
    findByHandlerId: jest.fn(),
    countByHandlerId: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
  const ticketMessageRepository = {
    save: jest.fn(),
    markAsReadByReceiver: jest.fn(),
  };
  const notificationService = {
    send: jest.fn(),
  };
  const userRepository = {
    createQueryBuilder: jest.fn(),
    findByIdWithPermissions: jest.fn(),
  };
  const assigneeQueryBuilder = {
    leftJoin: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    getOne: jest.fn(),
  };

  const service = new TicketsService(
    ticketRepository as any,
    ticketMessageRepository as any,
    notificationService as any,
    userRepository as any,
  );

  const ticket = (overrides = {}) =>
    ({
      id: 41,
      creator_id: 12,
      assignee_id: 7,
      type: "manager",
      subject: "Нужна помощь",
      status: "open",
      messages: [],
      ...overrides,
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    ticketRepository.findByCreatorId.mockResolvedValue([]);
    ticketRepository.findByHandlerId.mockResolvedValue([]);
    ticketRepository.countByHandlerId.mockResolvedValue(3);
    ticketRepository.count.mockResolvedValue(2);
    ticketRepository.update.mockResolvedValue({ affected: 1 });
    ticketMessageRepository.save.mockResolvedValue({ id: 1 });
    notificationService.send.mockResolvedValue(undefined);
    for (const method of [
      "leftJoin",
      "where",
      "andWhere",
      "orderBy",
    ] as const) {
      assigneeQueryBuilder[method].mockReturnValue(assigneeQueryBuilder);
    }
    assigneeQueryBuilder.getOne.mockResolvedValue({ id: 55 });
    userRepository.createQueryBuilder.mockReturnValue(assigneeQueryBuilder);
    userRepository.findByIdWithPermissions.mockResolvedValue(
      userWithRoles(99, RoleTypes.Employee, [RoleTypes.PartnerManager]),
    );
  });

  it.each([RoleTypes.PartnerManager, RoleTypes.TechnicalSpecialist])(
    "uses handler scope for secondary %s role",
    async (secondaryRole) => {
      const user = userWithRoles(7, RoleTypes.Employee, [secondaryRole]);

      await expect(service.findAll(user)).resolves.toEqual([]);
      await expect(service.getCount(user)).resolves.toBe(3);

      expect(ticketRepository.findByHandlerId).toHaveBeenCalledWith(7);
      expect(ticketRepository.countByHandlerId).toHaveBeenCalledWith(7);
      expect(ticketRepository.findByCreatorId).not.toHaveBeenCalled();
      expect(ticketRepository.count).not.toHaveBeenCalled();
    },
  );

  it("keeps creator scope for a regular partner", async () => {
    const user = userWithRoles(12, RoleTypes.Partner);

    await expect(service.findAll(user)).resolves.toEqual([]);
    await expect(service.getCount(user)).resolves.toBe(2);

    expect(ticketRepository.findByCreatorId).toHaveBeenCalledWith(12);
    expect(ticketRepository.count).toHaveBeenCalledWith({
      where: { creator_id: 12 },
    });
    expect(ticketRepository.findByHandlerId).not.toHaveBeenCalled();
  });

  it("allows an assigned secondary technical specialist to read and answer", async () => {
    const user = userWithRoles(7, RoleTypes.Employee, [
      RoleTypes.TechnicalSpecialist,
    ]);
    const currentTicket = ticket({ type: "tech_specialist" });
    ticketRepository.findById.mockResolvedValue(currentTicket);
    ticketRepository.findByHandlerId.mockResolvedValue([currentTicket]);

    await expect(
      service.addMessage(41, user, { message: "Проверил конфигурацию" }),
    ).resolves.toEqual(expect.objectContaining({ id: 41 }));

    expect(ticketMessageRepository.save).toHaveBeenCalledWith({
      ticket_id: 41,
      sender_id: 7,
      message: "Проверил конфигурацию",
      attachments: [],
      is_read: false,
    });
    expect(ticketRepository.update).toHaveBeenCalledWith(41, {
      status: "in_progress",
    });
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 12, ticket_id: 41 }),
    );
  });

  it.each([
    ["close", "open", "closed", RoleTypes.PartnerManager],
    ["reopen", "closed", "in_progress", RoleTypes.TechnicalSpecialist],
  ] as const)(
    "lets a secondary handler %s an assigned ticket",
    async (operation, initialStatus, nextStatus, secondaryRole) => {
      const user = userWithRoles(7, RoleTypes.Employee, [secondaryRole]);
      const currentTicket = ticket({ status: initialStatus });
      ticketRepository.findById.mockResolvedValue(currentTicket);
      ticketRepository.findByHandlerId.mockResolvedValue([currentTicket]);

      await expect(service[operation](41, user)).resolves.toEqual(
        expect.objectContaining({ id: 41 }),
      );

      expect(ticketRepository.update).toHaveBeenCalledWith(41, {
        status: nextStatus,
      });
      expect(notificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 12, ticket_id: 41 }),
      );
    },
  );

  it("rejects close before repository access for a non-handler", async () => {
    const user = userWithRoles(12, RoleTypes.Partner);

    await expect(service.close(41, user)).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
    });
    expect(ticketRepository.findById).not.toHaveBeenCalled();
  });

  it("assigns technical tickets only to an active non-archived specialist", async () => {
    const creator = userWithRoles(12, RoleTypes.Partner);

    await expect(
      (service as any).resolveAssigneeId(creator, "tech_specialist"),
    ).resolves.toBe(55);

    expect(assigneeQueryBuilder.where).toHaveBeenCalledWith(
      expect.stringContaining("r.deleted_at IS NULL"),
      { roleName: RoleTypes.TechnicalSpecialist },
    );
    expect(assigneeQueryBuilder.where).toHaveBeenCalledWith(
      expect.stringContaining("primary_role.deleted_at IS NULL"),
      { roleName: RoleTypes.TechnicalSpecialist },
    );
    expect(assigneeQueryBuilder.andWhere).toHaveBeenCalledWith(
      "u.deleted_at IS NULL",
    );
    expect(assigneeQueryBuilder.andWhere).toHaveBeenCalledWith(
      "u.is_activated = :isActivated",
      { isActivated: true },
    );
    expect(assigneeQueryBuilder.orderBy).toHaveBeenCalledWith("u.id", "ASC");
  });

  it("assigns manager tickets only to an active partner manager", async () => {
    const creator = userWithRoles(12, RoleTypes.Partner);
    userRepository.findByIdWithPermissions.mockResolvedValue({
      ...userWithRoles(99, RoleTypes.Employee, [RoleTypes.PartnerManager]),
      is_activated: true,
    });

    await expect(
      (service as any).resolveAssigneeId(creator, "manager"),
    ).resolves.toBe(99);
    expect(userRepository.findByIdWithPermissions).toHaveBeenCalledWith(99);
  });

  it.each([
    {
      label: "inactive manager",
      manager: {
        ...userWithRoles(99, RoleTypes.Employee, [RoleTypes.PartnerManager]),
        is_activated: false,
      },
    },
    {
      label: "user without partner_manager role",
      manager: {
        ...userWithRoles(99, RoleTypes.Employee),
        is_activated: true,
      },
    },
    { label: "missing manager", manager: null },
  ])("does not assign a $label", async ({ manager }) => {
    const creator = userWithRoles(12, RoleTypes.Partner);
    userRepository.findByIdWithPermissions.mockResolvedValue(manager);

    await expect(
      (service as any).resolveAssigneeId(creator, "manager"),
    ).resolves.toBeNull();
  });
});
