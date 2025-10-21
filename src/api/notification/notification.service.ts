import { NotificationsReadDto } from "@api/notification/dto/notifications-read.dto";
import { MailerService } from "@nestjs-modules/mailer";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
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
    const { user_id, title, text, email: additionalEmail } = data;
  
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
  
    const filteredSettingTypes = userSettingEntities.filter(
      (userSetting) => userSetting.value === UserNotificationType.Yes,
    );
  
    for (const filteredSetting of filteredSettingTypes) {
      const type = mapSettingToNotificationType[filteredSetting.type];
  
      await this.actionByType[type]({
        user_id: user.id,
        email: user.email,
        title,
        text,
        type,
      });
    }
  
    if (additionalEmail && additionalEmail !== user.email) {
      await new Promise(resolve => setTimeout(resolve, 2000));
  
      for (const filteredSetting of filteredSettingTypes) {
        const type = mapSettingToNotificationType[filteredSetting.type];
  
        await this.actionByType[type]({
          user_id: user.id,
          email: additionalEmail,
          title,
          text,
          type,
        });
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
    const { user_id, title, text, type } = data;

    return await this.notificationRepository.save({
      user_id,
      title,
      text,
      type,
    });
  }

  async getAll(id: number) {
    const notifications = await this.notificationRepository.findBy({
      user_id: id,
    });
    return notifications;
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
