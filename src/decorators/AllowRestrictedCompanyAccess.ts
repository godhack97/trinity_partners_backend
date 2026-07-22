import { SetMetadata } from "@nestjs/common";

export const ALLOW_RESTRICTED_COMPANY_ACCESS =
  "allow_restricted_company_access";

export const AllowRestrictedCompanyAccess = () =>
  SetMetadata(ALLOW_RESTRICTED_COMPANY_ACCESS, true);
