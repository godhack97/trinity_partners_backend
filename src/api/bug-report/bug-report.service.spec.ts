import { BadRequestException } from "@nestjs/common";
import { SmtpSettingsService } from "@api/admin/smtp-settings/smtp-settings.service";
import { BUG_REPORT_RECIPIENT } from "./bug-report.constants";
import { BugReportService } from "./bug-report.service";

describe("BugReportService", () => {
  it("sends an escaped bug report to the configured support mailbox", async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: "test" });
    const service = new BugReportService(
      { sendMail } as unknown as SmtpSettingsService,
    );
    const screenshot = {
      originalname: "ошибка.png",
      mimetype: "image/png",
      size: 4,
      buffer: Buffer.from("test"),
    } as Express.Multer.File;

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
      [screenshot],
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
    expect(mail.attachments).toEqual([
      {
        filename: "ошибка.png",
        content: screenshot.buffer,
        contentType: "image/png",
      },
    ]);
  });

  it("rejects attachments whose total size exceeds 15 MB", async () => {
    const sendMail = jest.fn();
    const service = new BugReportService(
      { sendMail } as unknown as SmtpSettingsService,
    );

    await expect(
      service.send(
        { id: 42, email: "partner@example.com" } as any,
        { message: "Ошибка" },
        [
          {
            size: 15 * 1024 * 1024 + 1,
          } as Express.Multer.File,
        ],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(sendMail).not.toHaveBeenCalled();
  });
});
