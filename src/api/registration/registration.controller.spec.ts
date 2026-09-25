import { ALLOW_RESTRICTED_COMPANY_ACCESS } from "@decorators/AllowRestrictedCompanyAccess";
import { RegistrationController } from "./registration.controller";

describe("RegistrationController resend access", () => {
  it("allows an authenticated inactive user to resend confirmation email", () => {
    expect(
      Reflect.getMetadata(
        ALLOW_RESTRICTED_COMPANY_ACCESS,
        RegistrationController.prototype.resend,
      ),
    ).toBe(true);
  });
});
