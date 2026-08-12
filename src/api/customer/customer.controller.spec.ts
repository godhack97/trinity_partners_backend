import { RoleTypes } from "@app/types/RoleTypes";
import { ACCEPTED_ROLES } from "@decorators/Roles";
import { CustomerController } from "./customer.controller";

describe("CustomerController access", () => {
  it("does not expose the global PII list to partner roles", () => {
    expect(Reflect.getMetadata(ACCEPTED_ROLES, CustomerController)).toEqual([
      RoleTypes.SuperAdmin,
    ]);
  });
});
