import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResetTokenRepository } from 'src/orm/repositories/reset-token.repository';
import { UserRepository } from 'src/orm/repositories/user.repository';
import {
  createHash,
  createPassword,
  createToken,
  verifyPassword,
} from 'src/utils/password';
import { AuthLoginRequestDto } from './dto/request/auth-login.request.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly resetTokenRepository: ResetTokenRepository,
    private readonly mailService: MailerService,
    private readonly configService: ConfigService,
  ) {}
  async login(authLoginDto: AuthLoginRequestDto) {
    let user = await this.userRepository.findByEmail(authLoginDto.email);
    if (!user) throw new UnauthorizedException();

    const isVerify = await verifyPassword({
      user_password: user.password,
      password: authLoginDto.password,
      salt: user.salt,
    });

    if (!isVerify) throw new UnauthorizedException();

    const token = await createToken(user.salt);
    await this.userRepository.update(user.id, { token });
    user = await this.userRepository.findByEmail(authLoginDto.email);
    return {
      token,
      user,
    };
  }

  async logout(authorization: string) {
    const token = authorization.substring(7);
    const user = await this.userRepository.findByToken(token);

    if (!user) throw new UnauthorizedException();

    await this.userRepository.update(user.id, { token: null });
  }

  async updatePassword(authorization, { password, newPassword }) {
    const token = authorization.substring(7);
    const user = await this.userRepository.findByToken(token);

    if (!user) throw new UnauthorizedException();

    const isVerify = await verifyPassword({
      user_password: user.password,
      password,
      salt: user.salt,
    });

    if (!isVerify) throw new UnauthorizedException();

    const passwordHashed = await createPassword({
      password: newPassword,
      salt: user.salt,
    });

    await this.userRepository.update(user.id, { password: passwordHashed });
  }

  async forgotPassword({ email }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new UnauthorizedException();

    const hashToken = createHash();

    await this.resetTokenRepository.save({
      token: hashToken,
      user_id: user.id,
    });
    await this.sendMail({ email: user.email, token: hashToken });
  }

  async changeForgotPassword({ token, password, password2 }) {
    const resetToken = await this.resetTokenRepository.findByToken(token);
    if (!resetToken) throw new UnauthorizedException();

    const user = await this.userRepository.findById(resetToken.user_id);
    if (!user) throw new UnauthorizedException();

    if (password !== password2) throw new UnauthorizedException();

    const passwordHashed = await createPassword({ password, salt: user.salt });

    await this.userRepository.update(user.id, { password: passwordHashed });
  }

  private async sendMail({ email, token }) {
    const hostname = this.configService.get('HOSTNAME');

    return await this.mailService.sendMail({
      from: `support@${hostname}`,
      to: email,
      subject: 'Восстановление',
      html: `<b>Востановите пароль по<a href="${hostname}/restore?token=${token}">ссылке</a></b>`,
    });
  }
}
