import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { EmailConfirmerMethod } from "@api/email-confirmer/types";
import { NewsService } from "@api/news/news.service";
import { NotificationService } from "@api/notification/notification.service";
import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { ResetHashRepository } from '@orm/repositories/reset-hash.repository';
import { UserRepository } from 'src/orm/repositories/user.repository';
import { UserToken } from 'src/orm/entities/user-token.entity';
import { ResetHashEntity } from 'src/orm/entities/reset-hash.entity';
import {
  createCredentials,
  createPassword,
  createToken,
  verifyPassword,
} from 'src/utils/password';
import { AuthLoginRequestDto } from './dto/request/auth-login.request.dto';
import { RoleTypes } from "@app/types/RoleTypes";

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    @InjectRepository(ResetHashEntity)
    private readonly resetHashRepository: Repository<ResetHashEntity>,
    private readonly emailConfirmerService: EmailConfirmerService,
    private readonly notificationService: NotificationService,
    private readonly newsService: NewsService,

    @InjectRepository(UserToken)
    private readonly userTokenRepository: Repository<UserToken>,
  ) { }

  async login(authLoginDto: AuthLoginRequestDto, clientId: string, req?: Request) {
    let user = await this.userRepository.findByEmail(authLoginDto.email);
    if (!user) throw new UnauthorizedException();

    const isVerify = await verifyPassword({
      user_password: user.password,
      password: authLoginDto.password,
      salt: user.salt,
    });
    if (!isVerify) throw new UnauthorizedException();

    let userToken = await this.userTokenRepository.findOneBy({
      user_id: user.id,
      client_id: clientId,
    });

    if (userToken) {
      if (req) {
        await this.updateUserActivity(user.id, req);
      }

      const token = userToken.token;
      if (user.role.name === RoleTypes.Partner) {
        user.owner_company = await user.lazy_owner_company;
      }
      return { token, user };
    }

    const token = await createToken(user.salt);

    userToken = this.userTokenRepository.create({
      user_id: user.id,
      token,
      client_id: clientId,
    });
    await this.userTokenRepository.save(userToken);

    if (req) {
      await this.updateUserActivity(user.id, req);
    }

    if (user.role.name === RoleTypes.Partner) {
      user.owner_company = await user.lazy_owner_company;
    }

    return { token, user };
  }

  async logout(authorization: string, clientId: string) {
    const token = authorization.substring(7);

    const tokenEntity = await this.userTokenRepository.findOneBy({ token, client_id: clientId });
    if (!tokenEntity) throw new UnauthorizedException();

    await this.userTokenRepository.delete({ token, client_id: clientId });
  }

  async check(authorization: string, clientId: string, req?: Request) {
    const token = authorization.substring(7);

    const tokenEntity = await this.userTokenRepository.findOneBy({ token, client_id: clientId });
    if (!tokenEntity) throw new UnauthorizedException();

    const user = await this.userRepository.findByIdWithCompanyEmployees(tokenEntity.user_id);
    if (!user) throw new HttpException(`Пользователь не найден`, HttpStatus.NOT_FOUND);

    if (req) {
      await this.updateUserActivity(tokenEntity.user_id, req);
    }

    const notifications = await this.notificationService.check(user.id);
    const notifications_unread = await this.notificationService.countUnread(user.id);
    const notifications_settings = await this.notificationService.getSettings(user.id);
    const news = await this.newsService.check();

    return {
      ...user,
      notifications,
      notifications_unread,
      notifications_settings,
      news
    };
  }

  async updatePassword(authorization: string, clientId: string, { password, newPassword }) {
    const token = authorization.substring(7);

    const tokenEntity = await this.userTokenRepository.findOneBy({ token, client_id: clientId });
    if (!tokenEntity) throw new UnauthorizedException();

    const user = await this.userRepository.findById(tokenEntity.user_id);
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

    await this.userRepository.updateUser(user.id, { password: passwordHashed });
  }

  async forgotPassword({ email }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new UnauthorizedException('Пользователь c таким E-mail не найден!');

    await this.emailConfirmerService.send({
      user_id: user.id,
      email,
      method: EmailConfirmerMethod.Recovery
    });
  }

  async recoveryPassword({ hash, email, password, repeat }) {
    const resetHashEntity = await this.resetHashRepository.findOneBy({ hash, email });
    if (!resetHashEntity) throw new UnauthorizedException();

    const user = await this.userRepository.findById(resetHashEntity.user_id);
    if (!user) throw new UnauthorizedException();

    if (password !== repeat) throw new UnauthorizedException();

    const { password: passwordHashed, salt } = await createCredentials(password);

    await this.userRepository.updateUser(user.id, { password: passwordHashed, salt });

    await this.emailConfirmerService.confirm({
      hash,
      email,
      method: EmailConfirmerMethod.Recovery
    });
  }

  private async updateUserActivity(userId: number, req: Request) {
    const user = await this.userRepository.findById(userId);
    if (!user?.lastActivity?.lastSeen) {
      await this.saveActivity(userId, req);
      return;
    }

    const lastSeen = new Date(user.lastActivity.lastSeen);
    const now = new Date();

    if (now.getTime() - lastSeen.getTime() > 60000) {
      await this.saveActivity(userId, req);
    }
  }

  private async saveActivity(userId: number, req: Request) {
    const ip = req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.ip;
    const userAgent = req.headers['user-agent'] || '';
    const deviceInfo = this.parseUserAgent(userAgent);
    const clientIp = typeof ip === 'string' && ip.includes(',')
      ? ip.split(',')[0].trim()
      : ip;
    const cleanIp = clientIp?.replace('::ffff:', '') || 'unknown';

    await this.userRepository.updateUser(userId, {
      lastActivity: {
        lastSeen: new Date(),
        ip: cleanIp,
        browser: deviceInfo.browser,
        device: deviceInfo.device,
        os: deviceInfo.os
      }
    });
  }

  private parseUserAgent(userAgent: string) {
    return {
      browser: userAgent.includes('Chrome') ? 'Chrome' :
        userAgent.includes('Firefox') ? 'Firefox' :
          userAgent.includes('Safari') ? 'Safari' :
            userAgent.includes('Edge') ? 'Edge' : 'Other',
      device: userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
      os: userAgent.includes('Windows') ? 'Windows' :
        userAgent.includes('Mac OS') ? 'macOS' :
          userAgent.includes('Linux') ? 'Linux' :
            userAgent.includes('Android') ? 'Android' :
              userAgent.includes('iOS') ? 'iOS' : 'Other'
    };
  }

  async getUserActivity(userId: number) {
    const user = await this.userRepository.findById(userId);
    if (!user?.lastActivity) {
      return { isOnline: false, lastActivity: null };
    }

    const isOnline = this.isUserOnline(user.lastActivity.lastSeen);
    return {
      isOnline,
      lastActivity: user.lastActivity
    };
  }

  private isUserOnline(lastSeen: string | Date): boolean {
    if (!lastSeen) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastSeen) > fiveMinutesAgo;
  }
}