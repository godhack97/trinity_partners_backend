import { RoleTypes } from "@app/types/RoleTypes";
import { ProfileService } from "./profile.service";

describe("ProfileService business roles", () => {
  const makeService = (user: any) => {
    const userInfoRepository = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const service = new ProfileService(
      { findOne: jest.fn().mockResolvedValue(user) } as any,
      userInfoRepository as any,
      {} as any,
      {} as any,
      {} as any,
    );
    return { service, userInfoRepository };
  };

  it("updates an employee profile when the business role is primary", async () => {
    const { service, userInfoRepository } = makeService({
      id: 20,
      role: { name: RoleTypes.SalesManager },
      user_roles: [
        { role: { name: RoleTypes.SalesManager } },
      ],
      user_info: { id: 30 },
    });

    await service.update({ id: 20 } as any, {
      job_title: "Менеджер",
      phone: "+79990000000",
    });

    expect(userInfoRepository.update).toHaveBeenCalledWith(30, {
      job_title: "Менеджер",
      phone: "+79990000000",
      photo_url: "",
    });
  });

  it("updates a profile when the allowed role is secondary", async () => {
    const { service, userInfoRepository } = makeService({
      id: 20,
      role: { name: "custom_role" },
      user_roles: [{ role: { name: RoleTypes.Employee } }],
      user_info: { id: 30 },
    });

    await service.update({ id: 20 } as any, {
      job_title: "Сотрудник",
      phone: "+79990000000",
    });

    expect(userInfoRepository.update).toHaveBeenCalled();
  });
});
