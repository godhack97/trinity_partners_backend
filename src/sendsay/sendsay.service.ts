import { HbsViewService } from "@app/hbs-view/hbs-view.service";
import { Injectable } from "@nestjs/common";
import axios from "axios";

type SendMail = {
  from?:string,
  to: string,
  subject: string,
  html?: string,
  template?: string,
  context?: string,
}

@Injectable()
export class SendsayService {
  constructor(
    private readonly hbsViewService: HbsViewService,
  ) {}

  senderlogin = 'trinity.trinity@smtpgate'

  apikey = ''

  URL = 'https://api.sendsay.ru/general/api/v100/json/'

  from: 'partners@trinity.ru'

  async sendMail(data: SendMail) {
    const body = this.createData(data)

    const endpoint = `${this.URL}${this.senderlogin}`;
    return await axios.post(endpoint, body)
  }

  async sendFake(data: SendMail) {
    let message = this.createMessage(data);
    return message.html
  }

  private createData({ to , subject, html, template, context }: SendMail) {
    const message  = this.createMessage({ html, template, context })

    return {
      action: "issue.send",
      letter: {
        message,
        subject,
        "from.email": this.from
      },
      group: 'personal',
      email: to,
      sendwhen: 'now',
      apikey: this.apikey
    }
  }

  createMessage({ html, template, context }: Partial<SendMail>) {
    if(template) {
      return {
        html: this.hbsViewService.createHtml({ template, context })
      }
    }
    return { html }
  }
}