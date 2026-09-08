import { MailerService } from "@nestjs-modules/mailer";
import { BugReportService, BUG_REPORT_RECIPIENT } from "./bug-report.service";

describe("BugReportService", () => {
  it("sends an escaped bug report to the configured support mailbox", async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: "test" });
    const service = new BugReportService({ sendMail } as unknown as MailerService);

    await service.send(
      {
        id: 42,
        email: "partner@example.com",
        user_info: {
          first_name: "Иван",
          last_name: "Иванов",
          company_name: "ООО Тест",
        },
      } as any,
      {
        message: "Не работает <кнопка>\nПосле нажатия",
        pageUrl: "https://partner.trinity.ru/dashboard?a=1&b=2",
      },
      { userAgent: "Test <Browser>" },
    );

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: BUG_REPORT_RECIPIENT,
        replyTo: "partner@example.com",
        subject:
          "[Партнёрский портал] Сообщение о баге от пользователя #42",
      }),
    );

    const mail = sendMail.mock.calls[0][0];
    expect(mail.text).toContain("Не работает <кнопка>");
    expect(mail.html).toContain("Не работает &lt;кнопка&gt;<br>После нажатия");
    expect(mail.html).toContain("Test &lt;Browser&gt;");
    expect(mail.html).not.toContain("<кнопка>");
  });
});
