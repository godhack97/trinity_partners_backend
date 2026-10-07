import { AuthGuard } from "./auth.guard";
import { hashSessionToken } from "@app/utils/session-token";

const makeContext = (request: any) =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as any;

describe("AuthGuard", () => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  };
  const findOne = jest.fn();
  const guard = new AuthGuard({} as any, reflector as any, { findOne } as any);

  beforeEach(() => {
    reflector.getAllAndOverride.mockReturnValue(false);
    findOne.mockReset();
  });

  it("does not reclassify an authenticated impersonation cookie as a bearer session", async () => {
    const user = { id: 221, email: "a.reva@trinity.ru", is_activated: true };
    const request: any = {
      headers: {},
      cookies: { trinity_session: "impersonation-token" },
    };
    findOne.mockResolvedValueOnce({ user });

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(request.headers.authorization).toBe(
      "Bearer impersonation-token",
    );

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(findOne).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          token: hashSessionToken("impersonation-token"),
        }),
      }),
    );
  });
});
