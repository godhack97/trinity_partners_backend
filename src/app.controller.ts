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

  ) {}

  @Public()
  @Get()
  getHello(): string {
    return 'Hello server!';
  }
}
