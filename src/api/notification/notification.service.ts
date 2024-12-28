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
    userId: number;
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
    ) {
    }

    async send(data: NotificationSendDto) {
        const {userId, title, text} = data;

        const user = await this.userRepository.findById(userId);
        const userSettingEntities = await this.userSettingRepository.findBy({ type: In(NotificationSettingsTypes) });

        const filteredSettingTypes = userSettingEntities
            .filter((userSetting) => userSetting.value === UserNotificationType.Yes)

        for (const filteredSetting of filteredSettingTypes) {
            const type = mapSettingToNotificationType[filteredSetting.type];
            const actionByType = {
                [NotificationType.Site]: this.sendWeb,
                [NotificationType.Email]: this.sendEmail,
            }

            await actionByType[type]({
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
            hostname = this.configService.get('EMAIL_USERNAME');

        return await this.mailerService.sendMail({
            from: `://${hostname}`,
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
}