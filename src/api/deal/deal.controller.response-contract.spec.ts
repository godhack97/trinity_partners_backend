import { INTERCEPTORS_METADATA } from "@nestjs/common/constants";
import { DealController } from "./deal.controller";

describe("DealController response safety", () => {
  it.each([
    "submit",
    "update",
    "updateStatus",
    "addConfigurations",
    "removeConfiguration",
    "updateConfiguration",
    "addAttachment",
    "addComment",
  ] as const)("sanitizes the %s deal response", (method) => {
    const interceptors = Reflect.getMetadata(
      INTERCEPTORS_METADATA,
      DealController.prototype[method],
    );

    expect(interceptors).toEqual(expect.arrayContaining([expect.any(Object)]));
  });
});
