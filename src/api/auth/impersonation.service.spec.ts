import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { hashSessionToken } from "@app/utils/session-token";
import { ImpersonationService } from "./impersonation.service";

describe("ImpersonationService", () => {
  const target = { id: 42, email: "target@example.test" };
  const actor = {
    id: 143,
    email: "delegated-admin@example.test",
    role: {
      name: "content_manager",
      permissions: [{ name: "system.admin-users.impersonate" }],
    },
  } as any;
  const userRepository = {
    findByIdWithPermissions: jest.fn(),
  };
  const userTokenRepository = {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    merge: jest.fn((entity, patch) => ({ ...entity, ...patch })),
    save: jest.fn(async (value) => value),
    update: jest.fn(),
  };
  const userActionsService = { log: jest.fn() };
  const service = new ImpersonationService(
    userRepository as any,
    userTokenRepository as any,
    userActionsService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    userRepository.findByIdWithPermissions.mockResolvedValue(target);
    userTokenRepository.findOneBy.mockResolvedValue(null);
    userTokenRepository.update.mockResolvedValue({ affected: 1 });
  });

  it("rejects an administrator without the impersonation permission", async () => {
    await expect(
      service.issue({
        id: 7,
        email: "another-admin@example.test",
        role: { name: "content_manager", permissions: [] } as any,
      }, target.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(userTokenRepository.save).not.toHaveBeenCalled();
  });

  it("accepts the impersonation permission from a secondary role", async () => {
    const delegatedActor = {
      id: 8,
      role: { name: "employee_admin", permissions: [] },
      roles: [
        {
          name: "content_manager",
          permissions: [{ name: "system.admin-users.impersonate" }],
        },
      ],
    } as any;

    await expect(service.issue(delegatedActor, target.id)).resolves.toEqual(
      expect.objectContaining({ code: expect.any(String) }),
    );
  });

  it("stores only a hash of the short-lived exchange code and audits the target", async () => {
    const result = await service.issue(actor, target.id);

    expect(result.code).toMatch(/^[a-f0-9]{64}$/);
    expect(userTokenRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: target.id,
        client_id: `impersonation:exchange:${actor.id}`,
        token: hashSessionToken(result.code),
        revoked_at: null,
      }),
    );
    expect(userActionsService.log).toHaveBeenCalledWith(
      actor.id,
      "admin_user_impersonation_issued",
      expect.objectContaining({ target_user_id: target.id, target_email: target.email }),
    );
  });

  it("atomically consumes the code and creates an isolated portal session", async () => {
    const code = "a".repeat(64);
    userTokenRepository.findOne.mockResolvedValue({
      id: 9,
      user_id: target.id,
      client_id: `impersonation:exchange:${actor.id}`,
    });

    const result = await service.exchange(code, {
      headers: { "user-agent": "test-agent", "x-real-ip": "127.0.0.1" },
      socket: {},
    } as any);

    expect(userTokenRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 9, token: hashSessionToken(code) }),
      expect.objectContaining({ revoked_at: expect.any(Date) }),
    );
    expect(userTokenRepository.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        user_id: target.id,
        client_id: expect.stringMatching(
          new RegExp(`^web:portal:impersonated:${actor.id}:`),
        ),
        token: hashSessionToken(result.token),
      }),
    );
    expect(userActionsService.log).toHaveBeenLastCalledWith(
      actor.id,
      "admin_user_impersonation_started",
      expect.objectContaining({ target_user_id: target.id, ip: "127.0.0.1" }),
    );
  });

  it("rejects a code that lost the one-time consume race", async () => {
    userTokenRepository.findOne.mockResolvedValue({
      id: 9,
      user_id: target.id,
      client_id: `impersonation:exchange:${actor.id}`,
    });
    userTokenRepository.update.mockResolvedValue({ affected: 0 });

    await expect(service.exchange("b".repeat(64))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(userTokenRepository.save).not.toHaveBeenCalled();
  });
});
