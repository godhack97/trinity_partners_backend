import { MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  NotificationType,
  UserNotificationType,
  UserSettingType
} from "@orm/entities";
import {
  NotificationRepository,
  UserRepository,
  UserSettingRepository
} from "@orm/repositories";
import { In } from "typeorm";

type NotificationSendDto = {
  type?: "default";
  user_id: number;
  title: string;
  text: string;
}

const NotificationSettingsTypes = [UserSettingType.NOTIFICATIONS_WEB, UserSettingType.NOTIFICATIONS_EMAIL]

const mapSettingToNotificationType = {
  [UserSettingType.NOTIFICATIONS_WEB]: NotificationType.Site,
  [UserSettingType.NOTIFICATIONS_EMAIL]: NotificationType.Email,
}

type ActionDataType = {
  user_id: number,
  title: string,
  text: string
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
  }
  async send(data: NotificationSendDto) {
    const {user_id, title, text} = data;

    const user = await this.userRepository.findById(user_id);
    const userSettingEntities = await this.userSettingRepository.findBy({
      user_id,
      type: In(NotificationSettingsTypes)
    });

    const filteredSettingTypes = userSettingEntities
      .filter((userSetting) => userSetting.value === UserNotificationType.Yes)

    for (const filteredSetting of filteredSettingTypes) {
      const type = mapSettingToNotificationType[filteredSetting.type];

      await this.actionByType[type]({
        user_id: user.id,
        email: user.email,
        title,
        text,
        type
      })
    }
  }

  async sendEmail(data: ActionDataType & { email: string }) {
    const { email, title, text } = data,
      email_from = this.configService.get('EMAIL_USERNAME');

    return await this.mailerService.sendMail({
      from: `${email_from}`,
      to: email,
      subject: title,
      html: `${text}`,
    });
  }

  async sendWeb(data: ActionDataType & { type }) {
    const { user_id, title, text, type } = data

    return await this.notificationRepository.save({
      user_id,
      title,
      text,
      type,
    })
  }

  async getAll(id: number) {
    return await this.notificationRepository.findBy({
      user_id: id
    });
  }
}