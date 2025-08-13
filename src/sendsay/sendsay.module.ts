import { SendsayService } from "@app/sendsay/sendsay.service";
import { Global, Module } from "@nestjs/common";

@Global()
@Module({
  controllers: [],
  providers: [SendsayService],
  exports: [SendsayService], // Add this line
})
export class SendsayModule {}
