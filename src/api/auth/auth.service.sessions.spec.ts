import { RoleTypes } from "@app/types/RoleTypes";
import { hashSessionToken } from "src/utils/session-token";
import * as passwordUtils from "src/utils/password";
import { AuthService } from "./auth.service";

describe("AuthService sessions", () => {
  it("stores a hashed expiring session and returns only the raw token", async () => {
    jest.spyOn(passwordUtils, "verifyPassword").mockResolvedValue(true);

    const user = {
      id: 17,
      email: "user@example.test",
      password: "password-hash",
      salt: "salt",
      failed_login_attempts: 0,
      login_blocked_until: null,
      role: { name: RoleTypes.Employee },
      roles: [],
      company_employee: null,
    };
    const userRepository = {
      findByEmailWithPermissions: jest.fn().mockResolvedValue(user),
      update: jest.fn(),
    };
    const userTokenRepository = {
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      merge: jest.fn((entity, value) => ({ ...entity, ...value })),
      save: jest.fn(async (value) => value),
    };
    const service = new AuthService(
      userRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      userTokenRepository as any,
    );

    const response = await service.login(
      { email: user.email, password: "secret" } as any,
      "http://localhost:9130",
    );

    expect(response.token).toHaveLength(64);
    expect(userTokenRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: user.id,
        client_id: "web:portal",
        token: hashSessionToken(response.token),
        expires_at: expect.any(Date),
        revoked_at: null,
      }),
    );
    expect(userTokenRepository.save).toHaveBeenCalledTimes(1);
  });
});
