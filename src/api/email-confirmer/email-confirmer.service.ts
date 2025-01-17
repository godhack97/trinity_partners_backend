import { createHash } from "@app/utils/password";
import { MailerService } from "@nestjs-modules/mailer";
import {
  HttpException,
  HttpStatus,
  Injectable
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ResetTokenRepository,
  UserRepository
} from "@orm/repositories";

const confirmConfig = ({ link }: { link: string }) => ({
  registration: {
    subject: 'Регистрация пользователя',
    html: `<b>Подтвердите почту по <a href="${link}">ссылке</a>: <a href="${ link }">${ link }</a></b>`
  },
  restore: {
    subject: 'Восстановление пароля',
    html: `<b>Востановите пароль по <a href="${link}">ссылке</a>: <a href="${ link }">${ link }</a></b>`
  }
})

@Injectable()
export class EmailConfirmerService {
  constructor(
    private readonly mailService: MailerService,
    private readonly configService: ConfigService,
    private readonly resetTokenRepository: ResetTokenRepository,
    private readonly userRepository: UserRepository,
  ) {}

  mail = this.configService.get('EMAIL_USERNAME');
  hostname = this.configService.get('HOSTNAME');
  actions = {
    registration: this.registrationAction,
    restore: this.restoreAction,
  }

  async confirm(data: { hash: string, method: string }) {
    const { hash, method } = data;

    const resetToken = await this.resetTokenRepository.findOneBy({ token: hash})
    console.log('resetToken',resetToken)
    console.log('this',this)

    if(!resetToken) throw new HttpException('Хэш не найден', HttpStatus.NOT_FOUND)

    const action = this.actions[method];
    return await action.call(this, {resetToken});
  }

  async send(data1: { user_id: number, email: string, method: string }) {
    const { user_id, email, method } = data1;
    const hashToken = createHash();
    const link = `://${this.hostname}/${method}?verify=${hashToken}`

    const data = confirmConfig({ link })

    await this.resetTokenRepository.save({
      token: hashToken,
      user_id,
    });
    return await this.emailSend({
      email,
      ...data[method]
    })
  }

  private async emailSend({ email, subject, html }) {
    return await this.mailService.sendMail({
      from: `${this.mail}`,
      to: email,
      subject,
      html,
    });
  }

  private async registrationAction(data: { resetToken }) {
    const { resetToken } = data;
    const resetTokenDelete = await this.resetTokenRepository.remove(resetToken)

    if (!resetTokenDelete) {
      throw new HttpException('Не удалось удалить хэш', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const updateUser = await this.userRepository.update(resetToken.user_id, {
      email_confirmed: true,
    })

    if (updateUser.affected === 0) {
      throw new HttpException('Не удалось обновить пользователя', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async restoreAction(data: { resetToken }) {
    const { resetToken } = data;
    const resetTokenDelete = await this.resetTokenRepository.remove(resetToken)

    if (!resetTokenDelete) {
      throw new HttpException('Не удалось удалить хэш', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}