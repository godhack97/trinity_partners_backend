import { MailerService } from "@nestjs-modules/mailer";
import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppService } from './app.service';
import { Public } from "./decorators/Public";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,

  ) {}

  @Public()
  @Get()
  async getHello(): Promise<string> {
    const hostname = this.configService.get('EMAIL_USERNAME');

    return await this.mailerService.sendMail({
      from: `${hostname}`,
      to: 'godforger@yandex.ru',
      subject: 'asd',
      html: `asdasd`,
    });

    //return 'Hello server!';
  }
}
