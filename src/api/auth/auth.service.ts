import { EmailConfirmerService } from "@api/email-confirmer/email-confirmer.service";
import { EmailConfirmerMethod } from "@api/email-confirmer/types";
import { ImportantAlertService } from "@api/important-alert/important-alert.service";
import { NewsService } from "@api/news/news.service";
import { NotificationService } from "@api/notification/notification.service";
import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, Repository } from "typeorm";
import { Request } from "express";
import { ResetHashRepository } from "@orm/repositories/reset-hash.repository";
import { UserRepository } from "src/orm/repositories/user.repository";
import { UserToken } from "src/orm/entities/user-token.entity";
import { ResetHashEntity } from "src/orm/entities/reset-hash.entity";
import {
  createCredentials,
  createPassword,
  createToken,
  verifyPassword,
} from "src/utils/password";
import { AuthLoginRequestDto } from "./dto/request/auth-login.request.dto";
import { RoleTypes } from "@app/types/RoleTypes";
import {
  CompanyEmployeeStatus,
  CompanyEntity,
  CompanyStatus,
  DealEntity,
  DealStatus,
  NotificationCategory,
} from "@orm/entities";
import { createHmac, randomInt, timingSafeEqual } from "crypto";

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    @InjectRepository(ResetHashEntity)
    private readonly resetHashRepository: Repository<ResetHashEntity>,
    private readonly emailConfirmerService: EmailConfirmerService,
    private readonly importantAlertService: ImportantAlertService,
    private readonly notificationService: NotificationService,
    private readonly newsService: NewsService,
    @InjectRepository(UserToken)
    private readonly userTokenRepository: Repository<UserToken>,
    @InjectRepository(DealEntity)
    private readonly dealRepository: Repository<DealEntity>,
  ) {}

  async login(
    authLoginDto: AuthLoginRequestDto,
    clientId: string,
    req?: Request,
  ) {
    let user = await this.userRepository.findByEmailWithPermissions(authLoginDto.email);
    if (!user) throw new UnauthorizedException();

    this.assertLoginIsNotBlocked(user);
    this.assertCaptchaIfRequired(user, authLoginDto);

    const isVerify = await verifyPassword({
      user_password: user.password,
      password: authLoginDto.password,
      salt: user.salt,
    });
    if (!isVerify) {
      await this.registerFailedLoginAttempt(user);
    }

    await this.resetFailedLoginAttempts(user);
    await this.assertPortalAccessAllowed(user);

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

  private assertLoginIsNotBlocked(user: any) {
    if (!user.login_blocked_until) return;

    const blockedUntil = new Date(user.login_blocked_until);
    if (Number.isNaN(blockedUntil.getTime()) || blockedUntil <= new Date()) {
      return;
    }

    throw new HttpException(
      `Слишком много неудачных попыток входа. Повторите попытку после ${blockedUntil.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      })}.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private async registerFailedLoginAttempt(user: any): Promise<never> {
    const failedLoginAttempts = (user.failed_login_attempts || 0) + 1;
    const patch: Record<string, unknown> = {
      failed_login_attempts: failedLoginAttempts,
    };

    if (failedLoginAttempts >= 10) {
      const blockedUntil = new Date();
      blockedUntil.setMinutes(blockedUntil.getMinutes() + 15);
      patch.login_blocked_until = blockedUntil;

      await this.userRepository.update(user.id, patch);
      throw new HttpException(
        "Слишком много неудачных попыток входа. Вход заблокирован на 15 минут.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.userRepository.update(user.id, patch);

    if (failedLoginAttempts >= 3) {
      this.throwCaptchaRequired(user.email, failedLoginAttempts);
    }

    throw new UnauthorizedException();
  }

  private async assertPortalAccessAllowed(user: any) {
    const roleNames = [
      user.role?.name,
      ...(user.roles || []).map((role) => role.name),
    ];

    if (roleNames.includes(RoleTypes.SuperAdmin)) return;

    let company: CompanyEntity | undefined = user.company_employee?.company;
    if (
      !company &&
      (roleNames.includes(RoleTypes.Partner) ||
        roleNames.includes(RoleTypes.CompanyAdmin))
    ) {
      company = await user.lazy_owner_company;
    }

    if (company?.status === CompanyStatus.Suspended) {
      throw new HttpException(
        "Доступ к порталу приостановлен. Есть вопросы? Обратитесь к КЦ Тринити.",
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      [
        CompanyEmployeeStatus.Blocked,
        CompanyEmployeeStatus.Deleted,
      ].includes(user.company_employee?.status)
    ) {
      throw new HttpException(
        "Доступ к порталу заблокирован. Есть вопросы? Обратитесь к КЦ Тринити.",
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private assertCaptchaIfRequired(user: any, authLoginDto: AuthLoginRequestDto) {
    if ((user.failed_login_attempts || 0) < 3) return;

    if (
      this.isCaptchaAnswerValid(
        user.email,
        authLoginDto.captcha_token,
        authLoginDto.captcha_answer,
      )
    ) {
      return;
    }

    this.throwCaptchaRequired(user.email, user.failed_login_attempts || 3);
  }

  private throwCaptchaRequired(
    email: string,
    failedLoginAttempts: number,
  ): never {
    const captcha = this.createCaptchaChallenge(email);

    throw new HttpException(
      {
        message: "Подтвердите, что вы не робот: решите пример и повторите вход.",
        captcha_required: true,
        captcha_question: captcha.question,
        captcha_token: captcha.token,
        failed_login_attempts: failedLoginAttempts,
      },
      HttpStatus.UNAUTHORIZED,
    );
  }

  private createCaptchaChallenge(email: string) {
    const a = randomInt(2, 10);
    const b = randomInt(2, 10);
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const payload = {
      a,
      b,
      email: email.trim().toLowerCase(),
      expiresAt,
    };
    const signature = this.signCaptchaPayload(payload);
    const token = Buffer.from(
      JSON.stringify({ ...payload, signature }),
    ).toString("base64url");

    return {
      question: `${a} + ${b} = ?`,
      token,
    };
  }

  private isCaptchaAnswerValid(
    email: string,
    token?: string,
    answer?: string,
  ) {
    if (!token || !answer) return false;

    try {
      const payload = JSON.parse(
        Buffer.from(token, "base64url").toString("utf8"),
      ) as {
        a: number;
        b: number;
        email: string;
        expiresAt: number;
        signature: string;
      };

      const expectedSignature = this.signCaptchaPayload({
        a: payload.a,
        b: payload.b,
        email: payload.email,
        expiresAt: payload.expiresAt,
      });

      const signature = Buffer.from(payload.signature || "");
      const expected = Buffer.from(expectedSignature);

      if (
        signature.length !== expected.length ||
        !timingSafeEqual(signature, expected)
      ) {
        return false;
      }

      if (payload.email !== email.trim().toLowerCase()) return false;
      if (payload.expiresAt < Date.now()) return false;

      return Number(answer) === payload.a + payload.b;
    } catch {
      return false;
    }
  }

  private signCaptchaPayload(payload: {
    a: number;
    b: number;
    email: string;
    expiresAt: number;
  }) {
    return createHmac(
      "sha256",
      process.env.LOGIN_CAPTCHA_SECRET || "trinity-login-captcha",
    )
      .update(
        `${payload.email}|${payload.a}|${payload.b}|${payload.expiresAt}`,
      )
      .digest("hex");
  }

  private async resetFailedLoginAttempts(user: any) {
    if (!user.failed_login_attempts && !user.login_blocked_until) return;

    await this.userRepository.update(user.id, {
      failed_login_attempts: 0,
      login_blocked_until: null,
    });
  }

  async logout(authorization: string, clientId: string) {
    const token = authorization.substring(7);

    const tokenEntity = await this.userTokenRepository.findOneBy({
      token,
      client_id: clientId,
    });
    if (!tokenEntity) throw new UnauthorizedException();

    await this.userTokenRepository.delete({ token, client_id: clientId });
  }

  async check(authorization: string, clientId: string, req?: Request) {
    const token = authorization.substring(7);

    const tokenEntity = await this.userTokenRepository.findOneBy({
      token,
      client_id: clientId,
    });
    if (!tokenEntity) throw new UnauthorizedException();

    const user = await this.userRepository.findByIdWithPermissions(
      tokenEntity.user_id,
    );
    if (!user)
      throw new HttpException(`Пользователь не найден`, HttpStatus.NOT_FOUND);

    if (req) {
      await this.updateUserActivity(tokenEntity.user_id, req);
    }

    if (user.role.name === RoleTypes.Partner) {
      user.owner_company = await user.lazy_owner_company;
    }

    await this.notifyCompanyProfileIncomplete(user);
    await this.notifyCertificateExpiry(user);
    await this.notifyPurchaseDateApproaching(user);

    const notifications = await this.notificationService.check(user.id);
    const notifications_unread = await this.notificationService.countUnread(
      user.id,
    );
    const notifications_settings = await this.notificationService.getSettings(
      user.id,
    );
    const news = await this.newsService.check();
    const important_alerts = await this.importantAlertService.getActive(
      this.getUserCompanyId(user),
    );

    return {
      ...user,
      notifications,
      notifications_unread,
      notifications_settings,
      news,
      important_alerts,
    };
  }

  private async notifyCompanyProfileIncomplete(user: any) {
    const roleNames = [
      user.role?.name,
      ...(user.roles || []).map((role) => role.name),
    ];
    const isCompanyAdmin =
      roleNames.includes(RoleTypes.Partner) ||
      roleNames.includes(RoleTypes.CompanyAdmin) ||
      roleNames.includes(RoleTypes.EmployeeAdmin);

    if (!isCompanyAdmin) return;

    const company: CompanyEntity | undefined =
      user.owner_company || user.company_employee?.company;
    if (!company) return;

    const requiredFields: Array<keyof CompanyEntity> = [
      "name",
      "inn",
      "company_business_line",
      "employees_count",
      "site_url",
      "promoted_products",
      "products_of_interest",
      "main_customers",
    ];

    const isIncomplete = requiredFields.some((field) => {
      const value = company[field];
      return value === null || value === undefined || `${value}`.trim() === "";
    });

    if (!isIncomplete) return;

    await this.notificationService.sendOnceUnread({
      user_id: user.id,
      title: "Заполните профиль компании",
      text: "В профиле компании не заполнены обязательные сведения. Заполните профиль, чтобы данные компании были актуальны для сотрудников и сделок.",
      category: NotificationCategory.Company,
      actions: [
        {
          label: "Открыть профиль",
          url: "/company-profile",
        },
      ],
    });
  }

  private getUserCompanyId(user: any) {
    return user.owner_company?.id || user.company_employee?.company?.id || null;
  }

  private async notifyCertificateExpiry(user: any) {
    const company: CompanyEntity | undefined =
      user.owner_company || user.company_employee?.company;
    if (!company?.certificate_expiry) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiryDate = new Date(company.certificate_expiry);
    expiryDate.setHours(0, 0, 0, 0);

    const daysLeft = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (![30, 14, 7].includes(daysLeft)) return;

    await this.notificationService.sendOnceUnread({
      user_id: user.id,
      title: `Партнёрский договор истекает через ${daysLeft} ${this.getDaysLabel(daysLeft)}`,
      text: `Срок действия партнёрского договора/сертификата компании «${company.name}» истекает ${expiryDate.toLocaleDateString("ru-RU")}.`,
      category: NotificationCategory.Company,
      actions: [
        {
          label: "Профиль компании",
          url: "/company-profile",
        },
      ],
    });
  }

  private async notifyPurchaseDateApproaching(user: any) {
    if (!user?.id) return;

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() + 7);

    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const deals = await this.dealRepository.find({
      where: {
        creator_id: user.id,
        purchase_date: Between(startDate, endDate),
        status: In([DealStatus.Moderation, DealStatus.Registered]),
      },
    });

    await Promise.all(
      deals.map((deal) =>
        this.notificationService.sendOnceUnread({
          user_id: user.id,
          title: `В сделке №${deal.deal_num} приближается дата закупки`,
          text: `В сделке №${deal.deal_num} приближается дата закупки: ${new Date(deal.purchase_date).toLocaleDateString("ru-RU")}.`,
          category: NotificationCategory.Deal,
          actions: [
            {
              label: "Актуализировать",
              url: `/deals.management/${deal.id}`,
            },
          ],
        }),
      ),
    );
  }

  private getDaysLabel(days: number) {
    if (days === 1) return "день";
    if (days >= 2 && days <= 4) return "дня";
    return "дней";
  }

  // метод для получения пользователя с разрешениями по токену
  async getUserWithPermissionsByToken(authorization: string, clientId: string) {
    const token = authorization.substring(7);

    const tokenEntity = await this.userTokenRepository.findOneBy({
      token,
      client_id: clientId,
    });
    if (!tokenEntity) throw new UnauthorizedException();

    const user = await this.userRepository.findByIdWithPermissions(
      tokenEntity.user_id,
    );
    if (!user)
      throw new HttpException(`Пользователь не найден`, HttpStatus.NOT_FOUND);

    return user;
  }

  async updatePassword(
    authorization: string,
    clientId: string,
    { password, newPassword },
  ) {
    const token = authorization.substring(7);

    const tokenEntity = await this.userTokenRepository.findOneBy({
      token,
      client_id: clientId,
    });
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
    if (!user)
      throw new UnauthorizedException("Пользователь c таким E-mail не найден!");

    await this.emailConfirmerService.send({
      user_id: user.id,
      email,
      method: EmailConfirmerMethod.Recovery,
    });
  }

  async recoveryPassword({ hash, email, password, repeat }) {
    const resetHashEntity = await this.resetHashRepository.findOneBy({
      hash,
      email,
    });
    if (!resetHashEntity) throw new UnauthorizedException();
    await this.assertResetHashNotExpired(resetHashEntity);

    const user = await this.userRepository.findById(resetHashEntity.user_id);
    if (!user) throw new UnauthorizedException();

    if (password !== repeat) throw new UnauthorizedException();

    const { password: passwordHashed, salt } =
      await createCredentials(password);

    await this.userRepository.updateUser(user.id, {
      password: passwordHashed,
      salt,
    });

    await this.emailConfirmerService.confirm({
      hash,
      email,
      method: EmailConfirmerMethod.Recovery,
    });
  }

  private async assertResetHashNotExpired(resetHashEntity: ResetHashEntity) {
    if (!resetHashEntity.expire_date) return;

    const expireDate = new Date(resetHashEntity.expire_date);
    if (Number.isNaN(expireDate.getTime()) || expireDate >= new Date()) return;

    await this.resetHashRepository.delete(resetHashEntity.id);
    throw new HttpException("Срок действия ссылки истек", HttpStatus.GONE);
  }

  private async updateUserActivity(userId: number, req: Request) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user?.lastActivity?.lastSeen) {
        await this.saveActivity(userId, req);
        return;
      }

      const lastSeen = new Date(user.lastActivity.lastSeen);
      const now = new Date();

      if (now.getTime() - lastSeen.getTime() > 30000) {
        await this.saveActivity(userId, req);
      }
    } catch (error) {
      console.error("Error updating user activity:", error);
    }
  }

  private async saveActivity(userId: number, req: Request) {
    const forwarded = req.headers["x-forwarded-for"] as string;
    const realIp = req.headers["x-real-ip"] as string;

    let clientIp =
      forwarded?.split(",")[0]?.trim() ||
      realIp ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip;

    clientIp = clientIp?.replace("::ffff:", "") || "unknown";

    const userAgent = req.headers["user-agent"] || "";
    const deviceInfo = this.parseUserAgent(userAgent);

    await this.userRepository.updateUser(userId, {
      lastActivity: {
        lastSeen: new Date(),
        ip: clientIp,
        browser: deviceInfo.browser,
        device: deviceInfo.device,
        os: deviceInfo.os,
      },
    });
  }

  private parseUserAgent(userAgent: string) {
    return {
      browser: userAgent.includes("Chrome")
        ? "Chrome"
        : userAgent.includes("Firefox")
          ? "Firefox"
          : userAgent.includes("Safari") && !userAgent.includes("Chrome")
            ? "Safari"
            : userAgent.includes("Edge")
              ? "Edge"
              : userAgent.includes("Opera")
                ? "Opera"
                : "Other",
      device:
        userAgent.includes("Mobile") ||
        userAgent.includes("Android") ||
        userAgent.includes("iPhone")
          ? "Mobile"
          : "Desktop",
      os: userAgent.includes("Windows")
        ? "Windows"
        : userAgent.includes("Mac OS")
          ? "macOS"
          : userAgent.includes("Linux")
            ? "Linux"
            : userAgent.includes("Android")
              ? "Android"
              : userAgent.includes("iPhone") || userAgent.includes("iPad")
                ? "iOS"
                : "Other",
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
      lastActivity: user.lastActivity,
    };
  }

  private isUserOnline(lastSeen: string | Date): boolean {
    if (!lastSeen) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastSeen) > fiveMinutesAgo;
  }
}
