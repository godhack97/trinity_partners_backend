import { DealModule } from "@api/deal/deal.module";
import { DealService } from "@api/deal/deal.service";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { AdminModule } from "./admin.module";

describe("AdminModule", () => {
  it("uses the exported DealService instead of registering a second cron instance", () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AdminModule);
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AdminModule);

    expect(imports).toContain(DealModule);
    expect(providers).not.toContain(DealService);
  });
});
