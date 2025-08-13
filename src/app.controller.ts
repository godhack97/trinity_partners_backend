import { HbsViewService } from "@app/hbs-view/hbs-view.service";
import { SendsayService } from "@app/sendsay/sendsay.service";
import { MailerService } from "@nestjs-modules/mailer";
import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppService } from "./app.service";
import { Public } from "./decorators/Public";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
    private readonly hbsViewService: HbsViewService,
    private readonly mailerService: MailerService,
    private readonly sendsayService: SendsayService,
  ) {}

  @Public()
  @Get()
  async getHello() {
    // await this.mailerService.sendMail({
    //   to: 'godforger@yandex.ru',
    //   subject: 'ntcn',
    //   template: 'registration-employee--img-as-base64.hbs',
    //   context: {
    //     link: 'asdasda',
    //        URL: 'partner.trinity.ru'
    //   }
    // })

    // try {
    //   let to = 'rrikkster@gmail.com';
    //   let to1 = 'godforger@yandex.ru';
    //   const data: any = await this.sendsayService.sendMail({
    //     to: to,
    //     subject: 'проверка связи1',
    //     template: 'registration-employee--img-as-url.hbs',
    //     context: {
    //       link: 'asdasda',
    //       URL: 'partner.trinity.ru'
    //     }
    //   })
    //   console.log({
    //     data
    //   }, data.errors)
    // } catch (error) {
    //   console.log({
    //     error
    //   })
    // }

    return "Hello server!";
  }
}
