import { MailerService } from "@nestjs-modules/mailer";
import { Injectable, Logger } from "@nestjs/common";
import { UserEntity } from "@orm/entities";
import { CreateBugReportDto } from "./dto/create-bug-report.dto";

export const BUG_REPORT_RECIPIENT = "B2B_test@trinity.ru";

type BugReportRequestContext = {
  userAgent?: string;
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

@Injectable()
export class BugReportService {
  private readonly logger = new Logger(BugReportService.name);

  constructor(private readonly mailerService: MailerService) {}

  async send(
    user: UserEntity,
    dto: CreateBugReportDto,
    context: BugReportRequestContext = {},
  ) {
    const userName = [user.user_info?.first_name, user.user_info?.last_name]
      .filter(Boolean)
      .join(" ");
    const submittedAt = new Date();
    const messageHtml = escapeHtml(dto.message).replace(/\r?\n/g, "<br>");

    await this.mailerService.sendMail({
      to: BUG_REPORT_RECIPIENT,
      replyTo: user.email,
      subject: `[Партнёрский портал] Сообщение о баге от пользователя #${user.id}`,
      text: [
        "Сообщение о баге",
        "",
        dto.message,
        "",
        `Пользователь: ${userName || "Не указано"}`,
        `Email: ${user.email}`,
        `ID пользователя: ${user.id}`,
        `Компания: ${user.user_info?.company_name || "Не указана"}`,
        `Страница: ${dto.pageUrl || "Не указана"}`,
        `Браузер: ${context.userAgent || "Не указан"}`,
        `Время отправки: ${submittedAt.toISOString()}`,
      ].join("\n"),
      html: `
        <h2>Сообщение о баге</h2>
        <p>${messageHtml}</p>
        <hr>
        <p><strong>Пользователь:</strong> ${escapeHtml(userName || "Не указано")}</p>
        <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
        <p><strong>ID пользователя:</strong> ${user.id}</p>
        <p><strong>Компания:</strong> ${escapeHtml(user.user_info?.company_name || "Не указана")}</p>
        <p><strong>Страница:</strong> ${escapeHtml(dto.pageUrl || "Не указана")}</p>
        <p><strong>Браузер:</strong> ${escapeHtml(context.userAgent || "Не указан")}</p>
        <p><strong>Время отправки:</strong> ${submittedAt.toISOString()}</p>
      `,
    });

    this.logger.log(`Bug report sent by user ${user.id}`);

    return { message: "Сообщение об ошибке отправлено" };
  }
}
