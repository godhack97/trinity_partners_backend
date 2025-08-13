import { HbsViewService } from "@app/hbs-view/hbs-view.service";
import { Injectable } from "@nestjs/common";
import axios from "axios";

type SendMail = {
  from?: string;
  to: string;
  subject: string;
  html?: string;
  template?: string;
  context?: object;
};

@Injectable()
export class SendsayService {
  constructor(private readonly hbsViewService: HbsViewService) {}

  senderlogin = "trinity";

  apikey = "1_Hu8bVe4JYXgUAIOL985_PERxfp_oS_ykxkpwjfPA9i50Zq-mOrW";

  URL = "https://api.sendsay.ru/general/api/v100/json/";

  from: "partner@trinity.ru";

  async sendMail(data: SendMail) {
    const body = this.createData(data);

    const endpoint = `${this.URL}${this.senderlogin}`;
    return await axios.post(endpoint, body);
  }

  async sendFake(data: SendMail) {
    let message = this.createMessage(data);
    return message.html;
  }

  private createData({ to, subject, html, template, context }: SendMail) {
    const message = this.createMessage({ html, template, context });

    return {
      action: "issue.send",
      group: "personal",
      email: to,
      sendwhen: "now",
      apikey: this.apikey,
      letter: {
        "from.email": "partner@trinity.ru",
        subject,
        message,
      },
    };
  }

  createMessage({ html, template, context }: Partial<SendMail>) {
    if (template) {
      return {
        html: this.hbsViewService.createHtml({ template, context }),
      };
    }
    return { html };
  }
}
