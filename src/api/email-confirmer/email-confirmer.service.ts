import { emailSendConfig } from "@api/email-confirmer/config";
import {
  ActionParams,
  ConfirmParams,
  SendParams
} from "@api/email-confirmer/types";
import { createHash } from "@app/utils/password";
import { MailerService } from "@nestjs-modules/mailer";
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ResetHashRepository,
  UserRepository
} from "@orm/repositories";
import * as querystring from "node:querystring";

@Injectable()
export class EmailConfirmerService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly resetHashRepository: ResetHashRepository,
    private readonly userRepository: UserRepository,
  ) {}

  mail = this.configService.get('EMAIL_USERNAME');
  hostname = this.configService.get('HOSTNAME');

  confirmActions = {
    registration: this._registrationAction,
    recovery: this._restoreAction,
  }

  async confirm(data: ConfirmParams) {
    const { hash, method, email } = data;

    const resetHashEntity = await this.resetHashRepository.findOneBy({ hash, email })

    if(!resetHashEntity) throw new HttpException('Хэш не найден', HttpStatus.NOT_FOUND)

    const action = this.confirmActions[method];
    return await action.call(this, { resetHashEntity });
  }

  async send(data: SendParams) {
    const { user_id, email, method } = data;
    const hash = createHash();
    const qs = querystring.stringify({
      email,
      verify: hash
    })

    const link = `https://${this.hostname}/${method}?${qs}`

    const expire_date = this._createExpireDate();

    await this.resetHashRepository.save({
      hash,
      user_id,
      email,
      expire_date
    });

    return await this._emailSend({
      email,
      ...emailSendConfig({ link })[method]
    })
  }

  private async _emailSend({ email, subject, html }) {

      try {
        return await this.mailerService.sendMail({
          from: `${this.mail}`,
          to: email,
          subject,
          html,
        });
      } catch (error) {
        Logger.error(error);
      }
  }

  private async _restoreAction({ resetHashEntity }: ActionParams){
    return await this._deleteResetHashEntity({ resetHashEntity })
  }

  private async _registrationAction({ resetHashEntity }: ActionParams) {
    await this._deleteResetHashEntity({ resetHashEntity })

    const updateUser = await this.userRepository.update(resetHashEntity.user_id, {
      email_confirmed: true,
    })

    if (updateUser.affected === 0) {
      throw new HttpException('Не удалось обновить пользователя', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  private async _deleteResetHashEntity({ resetHashEntity }: ActionParams) {
    const resetHashDelete = await this.resetHashRepository.remove(resetHashEntity)

    if (!resetHashDelete) {
      throw new HttpException('Не удалось удалить', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private _createExpireDate(options: { addDays: number } = { addDays: 2 } ): string {
    const { addDays = 2 } = options;
    const d = new Date();
    d.setDate(d.getDate() + addDays);
    const yearString = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
    const timeString = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
    return`${yearString} ${timeString}`;
  }
}