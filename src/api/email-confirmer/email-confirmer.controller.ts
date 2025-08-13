import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { Public } from "@decorators/Public";
import { Body, Controller, Post } from "@nestjs/common";

@Controller("email-confirm")
export class EmailConfirmController {
  constructor(private readonly emailConfirmerService: EmailConfirmerService) {}

  @Public()
  @Post("/confirm")
  async confirm(@Body() data: any) {
    return await this.emailConfirmerService.confirm(data);
  }
}
