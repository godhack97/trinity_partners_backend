import { HbsViewService } from "@app/hbs-view/hbs-view.service";
import { Global, Module } from "@nestjs/common";

@Global()
@Module({
  imports: [],
  providers: [HbsViewService],
  exports: [HbsViewService],
})
export class HbsViewModule {}
