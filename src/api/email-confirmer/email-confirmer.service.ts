import { emailSendConfig } from "@api/email-confirmer/config";
import {
  ActionParams,
  ConfirmParams,
  SendParams
} from "@api/email-confirmer/types";
import { RoleTypes } from "@app/types/RoleTypes";
import { createHash } from "@app/utils/password";
import { MailerService } from "@nestjs-modules/mailer";
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger
} from "@nestjs/common";
import { InternalServerErrorException } from "@nestjs/common/exceptions/internal-server-error.exception";
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
  hostname = this.configService.get('FRONTEND_HOSTNAME');

  confirmActions = {
    registration: this._registrationAction,
    recovery: this._restoreAction,
  }

  confirmHtml = {
    [RoleTypes.Partner]: 'Ваша заявка на доступ к порталу принята. Ожидайте, пожалуйста, ответный e-mail с подтверждением доступа в течение 12 часов.',
    [RoleTypes.Employee]: 'Вы успешно зарегистрированы на портале. Ожидайте, когда вас добавят к списку сотрудников в партнерском аккаунте.',
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

  async resend(data: SendParams) {

    const { user_id, email, method } = data;

    const resetHashEntity = await this.resetHashRepository.findOne({
      where: { user_id },
      order: { id: 'DESC' }
    });

    if(!resetHashEntity) throw new BadRequestException('Пользователь для отправки не найден!')

    const qs = querystring.stringify({
      email: resetHashEntity.email,
      verify: resetHashEntity.hash
    })

    const link = `https://${this.hostname}/${method}?${qs}`

    return await this._emailSend({
      email,
      ...emailSendConfig({ link })[method]
    })

  }

  async emailSend({ email, subject, template, context }) {

    return await this._emailSend({ email, subject, template, context });

  }

  private async _emailSend({ email, subject, template, context }) {

      try {

        const isGmail = email.includes('gmail');
        const templateVariation = isGmail ? `${ template }--img-as-url` : `${ template }--img-as-base64`;

        return await this.mailerService.sendMail({
          from: `${this.mail}`,
          to: email,
          subject,
          template: templateVariation, // `.hbs` extension is appended automatically
          context,
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
      throw new InternalServerErrorException('Не удалось обновить пользователя');
    }

    const user = await this.userRepository.findById(resetHashEntity.user_id)

    if(!user) throw new InternalServerErrorException('Не удалось найти пользователя');

    const sendOpts = {
      email: user.email,
      subject: 'Подтверждение почты!',
    }

    switch (user.role.name) {
      case RoleTypes.Partner:
        await this._emailSend({
          ...sendOpts,
          //html: this.confirmHtml[RoleTypes.Partner],
          template: 'request-company-receive',
          context: {
            link: 'https://partner.trinity.ru/'
          }
        })
        break;
      case RoleTypes.Employee:
        await this._emailSend({
          ...sendOpts,
          template: 'registration-employee',
          context: {
            link: 'https://partner.trinity.ru/'
          }
        })
        break;
      default:
        break;
    }

  }
  private async _deleteResetHashEntity({ resetHashEntity }: ActionParams) {
    const resetHashDelete = await this.resetHashRepository.delete(resetHashEntity.id)

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
