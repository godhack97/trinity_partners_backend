import { HbsViewService } from "@app/hbs-view/hbs-view.service";
import { MailerService } from "@nestjs-modules/mailer";
import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppService } from './app.service';
import { Public } from "./decorators/Public";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
    private readonly hbsViewService: HbsViewService,

  ) {}

  @Public()
  @Get()
  getHello(): string {
    return this.hbsViewService.createHtml({
      template: 'registration-employee--img-as-base64.hbs',
      context: {
        link: 'asdasda',
        URL: 'asddas'
      }
    })
    return 'Hello server!';
  }
}
