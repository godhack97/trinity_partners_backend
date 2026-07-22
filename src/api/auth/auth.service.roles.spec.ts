import { AuthService } from "./auth.service";
import { UserEntity } from "@orm/entities/user.entity";
import { RoleTypes } from "@app/types/RoleTypes";

describe("AuthService role response", () => {
  it("exposes secondary roles returned by the UserEntity getter", async () => {
    const user = Object.assign(new UserEntity(), {
      id: 17,
      email: "manager@example.test",
      role: { id: 4, name: RoleTypes.Employee },
      user_roles: [
        {
          user_id: 17,
          role_id: 8,
          role: { id: 8, name: RoleTypes.PartnerManager },
        },
      ],
      company_employee: null,
      owner_company: null,
    });
    const userRepository = {
      findByIdWithPermissions: jest.fn().mockResolvedValue(user),
    };
    const notificationService = {
      check: jest.fn().mockResolvedValue([]),
      countUnread: jest.fn().mockResolvedValue(0),
      getSettings: jest.fn().mockResolvedValue({}),
    };
    const importantAlertService = {
      getActive: jest.fn().mockResolvedValue([]),
    };
    const newsService = { check: jest.fn().mockResolvedValue([]) };
    const userTokenRepository = {
      findOneBy: jest.fn().mockResolvedValue({ user_id: user.id }),
    };
    const service = new AuthService(
      userRepository as any,
      {} as any,
      {} as any,
      importantAlertService as any,
      notificationService as any,
      newsService as any,
      userTokenRepository as any,
    );

    const response = await service.check("Bearer test-token", "test-client");

    expect(response.roles).toEqual([
      expect.objectContaining({ name: RoleTypes.PartnerManager }),
    ]);
  });
});
