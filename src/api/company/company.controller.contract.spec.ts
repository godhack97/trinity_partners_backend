import { ParseEnumPipe } from "@nestjs/common";
import {
  INTERCEPTORS_METADATA,
  ROUTE_ARGS_METADATA,
} from "@nestjs/common/constants";
import { CompanyController } from "./company.controller";

describe("CompanyController partner directory contract", () => {
  it("validates partnershipType and sanitizes every company in the response", () => {
    const interceptors = Reflect.getMetadata(
      INTERCEPTORS_METADATA,
      CompanyController.prototype.findByPartnershipType,
    );
    expect(interceptors).toEqual(expect.arrayContaining([expect.any(Object)]));

    const routeArguments = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      CompanyController,
      "findByPartnershipType",
    );
    const parameterMetadata = Object.values(routeArguments || {}) as Array<{
      pipes?: unknown[];
    }>;

    expect(
      parameterMetadata.some(({ pipes = [] }) =>
        pipes.some((pipe) => pipe instanceof ParseEnumPipe),
      ),
    ).toBe(true);
  });
});
