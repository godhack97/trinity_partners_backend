import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateAdminRequestDto } from "./create-admin-request.dto";
import { UpdateAdminRequestDto } from "./update-admin-request.dto";

describe("internal admin role DTOs", () => {
  it("accepts every current internal role", async () => {
    for (const role of [
      "super_admin",
      "employee_admin",
      "content_manager",
      "partner_manager",
    ]) {
      const dto = plainToInstance(UpdateAdminRequestDto, { role });
      expect(await validate(dto)).toHaveLength(0);
    }
  });

  it("does not allow a portal role to be assigned through admin creation", async () => {
    const dto = plainToInstance(CreateAdminRequestDto, {
      email: "admin@example.com",
      password: "password123",
      role: "partner",
    });
    const errors = await validate(dto);

    expect(errors.some(({ property }) => property === "role")).toBe(true);
  });
});
