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
    const newsService = {
      check: jest.fn().mockResolvedValue([]),
      getUnreadCount: jest.fn().mockResolvedValue(3),
    };
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
    expect(response.news_unread).toBe(3);
  });

  it("uses a stable delivery key for the one-time incomplete-company alert", async () => {
    const company = { id: 7, name: "Компания" };
    const user = Object.assign(new UserEntity(), {
      id: 23,
      email: "partner@example.test",
      role: { id: 3, name: RoleTypes.Partner },
      user_roles: [],
      owner_company: company,
      lazy_owner_company: Promise.resolve(company),
      company_employee: null,
    });
    const userRepository = {
      findByIdWithPermissions: jest.fn().mockResolvedValue(user),
    };
    const notificationService = {
      sendOnce: jest.fn().mockResolvedValue({ id: 1 }),
      check: jest.fn().mockResolvedValue([]),
      countUnread: jest.fn().mockResolvedValue(1),
      getSettings: jest.fn().mockResolvedValue({}),
    };
    const service = new AuthService(
      userRepository as any,
      {} as any,
      {} as any,
      { getActive: jest.fn().mockResolvedValue([]) } as any,
      notificationService as any,
      {
        check: jest.fn().mockResolvedValue([]),
        getUnreadCount: jest.fn().mockResolvedValue(0),
      } as any,
      { findOneBy: jest.fn().mockResolvedValue({ user_id: user.id }) } as any,
    );

    await service.check("Bearer test-token", "test-client");

    expect(notificationService.sendOnce).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 23,
        title: "Заполните профиль компании",
        webOnly: true,
        delivery_key: "company-profile-incomplete:23",
      }),
    );
  });
});
