import { NotificationsReadDto } from "@api/notification/dto/notifications-read.dto";
import { MailerService } from "@nestjs-modules/mailer";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  NotificationCategory,
  NotificationType,
  UserNotificationType,
  UserSettingType,
} from "@orm/entities";
import {
  NotificationRepository,
  UserRepository,
  UserSettingRepository,
} from "@orm/repositories";
import { In } from "typeorm";

type NotificationSendDto = {
  type?: "default";
  user_id: number;
  title: string;
  text: string;
  category?: NotificationCategory;
  actions?: { label: string; url: string }[] | null;
  ticket_id?: number | null;
};

const NotificationSettingsTypes = [
  UserSettingType.NOTIFICATIONS_WEB,
  UserSettingType.NOTIFICATIONS_EMAIL,
];

const mapSettingToNotificationType = {
  [UserSettingType.NOTIFICATIONS_WEB]: NotificationType.Site,
  [UserSettingType.NOTIFICATIONS_EMAIL]: NotificationType.Email,
};

type ActionDataType = {
  user_id: number;
  title: string;
  text: string;
  category?: NotificationCategory;
  actions?: { label: string; url: string }[] | null;
  ticket_id?: number | null;
};

@Injectable()
export class NotificationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userSettingRepository: UserSettingRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  actionByType = {
    [NotificationType.Site]: this.sendWeb.bind(this),
    [NotificationType.Email]: this.sendEmail.bind(this),
  };
  async send(data: NotificationSendDto & { email?: string }) {
    const {
      user_id,
      title,
      text,
      category,
      email: additionalEmail,
      actions,
      ticket_id,
    } = data;

    if (!user_id) {
      Logger.error('User ID is null or undefined in NotificationService.send');
      return;
    }

    const user = await this.userRepository.findById(user_id);

    if (!user) {
      Logger.error(`User not found with ID: ${user_id}`);
      return;
    }

    const userSettingEntities = await this.userSettingRepository.findBy({
      user_id,
      type: In(NotificationSettingsTypes),
    });

    // Web-уведомление отправляется всегда, если настройка явно не отключена
    const webSetting = userSettingEntities.find(
      (s) => s.type === UserSettingType.NOTIFICATIONS_WEB,
    );
    const webEnabled = !webSetting || webSetting.value !== UserNotificationType.No;

    if (webEnabled) {
      await this.sendWeb({
        user_id: user.id,
        title,
        text,
        category,
        type: NotificationType.Site,
        actions: actions ?? null,
        ticket_id: ticket_id ?? null,
      });
    }

    // Email — только если явно включён
    const emailSetting = userSettingEntities.find(
      (s) => s.type === UserSettingType.NOTIFICATIONS_EMAIL,
    );
    const emailEnabled = emailSetting?.value === UserNotificationType.Yes || emailSetting?.value === "yes";

    if (emailEnabled) {
      await this.sendEmail({
        user_id: user.id,
        email: user.email,
        title,
        text,
      });

      if (additionalEmail && additionalEmail !== user.email) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.sendEmail({ user_id: user.id, email: additionalEmail, title, text });
      }
    }
  }

  async sendEmail(data: ActionDataType & { email: string }) {
    const { email, title, text } = data,
      email_from = this.configService.get("EMAIL_USERNAME");

    try {
      return await this.mailerService.sendMail({
        from: `${email_from}`,
        to: email,
        subject: title,
        html: `${text}`,
      });
    } catch (error) {
      Logger.error(error);
    }
  }

  async sendWeb(data: ActionDataType & { type }) {
    const { user_id, title, text, type, category, actions, ticket_id } = data;

    return await this.notificationRepository.save({
      user_id,
      title,
      text,
      type,
      category: category ?? NotificationCategory.System,
      actions: actions ?? null,
      ticket_id: ticket_id ?? null,
    });
  }

  async sendOnceUnread(data: NotificationSendDto & { email?: string }) {
    const existing = await this.notificationRepository.findOne({
      where: {
        user_id: data.user_id,
        title: data.title,
        category: data.category ?? NotificationCategory.System,
        is_read: false,
      },
    });

    if (existing) return existing;

    return this.send(data);
  }

  async getAll(id: number) {
    const notifications = await this.notificationRepository.findBy({
      user_id: id,
    });

    // Группировка уведомлений по ticket_id
    const grouped = new Map<number, typeof notifications>();
    const standalone: typeof notifications = [];

    for (const n of notifications) {
      if (n.ticket_id) {
        const group = grouped.get(n.ticket_id) ?? [];
        group.push(n);
        grouped.set(n.ticket_id, group);
      } else {
        standalone.push(n);
      }
    }

    const result: any[] = [...standalone];

    for (const [, group] of grouped) {
      // group уже отсортирована DESC по id (из orderBy entity)
      const [main, ...rest] = group;
      result.push({
        ...main,
        related: rest.length > 0 ? rest : undefined,
      });
    }

    // Итоговая сортировка по id DESC
    result.sort((a, b) => b.id - a.id);

    return result;
  }

  async check(id: number) {
    return await this.notificationRepository
      .createQueryBuilder()
      .where({ user_id: id })
      .limit(5)
      .getMany();
  }

  async getSettings(userId: number) {
    const userSettingEntities = await this.userSettingRepository.findBy({
      user_id: userId,
      type: In(NotificationSettingsTypes),
    });

    const settings = {};

    for (const setting of userSettingEntities) {
      const key = setting.type.toLowerCase();
      settings[key] = setting.value === UserNotificationType.Yes;
    }

    return settings;
  }

  async countUnread(id: number) {
    return await this.notificationRepository
      .createQueryBuilder()
      .where({
        user_id: id,
        is_read: false,
      })
      .getCount();
  }

  async readList(user_id: number, { ids }: NotificationsReadDto) {
    await this.notificationRepository
      .createQueryBuilder()
      .update()
      .set({ is_read: true, read_at: new Date() })
      .where({
        id: In(ids),
        user_id,
      })
      .execute();

    return await this.notificationRepository
      .createQueryBuilder()
      .where({
        id: In(ids),
        user_id,
      })
      .orderBy("id", "ASC")
      .getMany();
  }
}
