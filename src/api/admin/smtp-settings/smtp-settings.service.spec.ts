import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailerService } from "@nestjs-modules/mailer";
import { SmtpSettingEntity } from "@orm/entities";
import * as nodemailer from "nodemailer";
import { Repository } from "typeorm";
import { SmtpSettingsService } from "./smtp-settings.service";

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(),
}));

const env = {
  EMAIL_HOST: "smtp.example.com",
  EMAIL_PORT: "465",
  EMAIL_SECURE: "true",
  EMAIL_USERNAME: "portal@example.com",
  EMAIL_PASSWORD: "existing-secret",
};

const createService = (stored: SmtpSettingEntity | null = null) => {
  const repository = {
    findOneBy: jest.fn().mockResolvedValue(stored),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const configService = {
    get: jest.fn((key: keyof typeof env) => env[key]),
  };
  const mailerService = {
    addTransporter: jest.fn(),
    sendMail: jest.fn().mockResolvedValue({ messageId: "test" }),
  };

  return {
    service: new SmtpSettingsService(
      repository as unknown as Repository<SmtpSettingEntity>,
      configService as unknown as ConfigService,
      mailerService as unknown as MailerService,
    ),
    repository,
    mailerService,
  };
};

describe("SmtpSettingsService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("verifies the exact submitted SMTP connection", async () => {
    const verify = jest.fn().mockResolvedValue(true);
    const close = jest.fn();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ verify, close });
    const { service } = createService();

    await expect(
      service.verify({
        host: "smtp.changed.example",
        port: 587,
        secure: false,
        username: "new@example.com",
        password: "new-secret",
      }),
    ).resolves.toEqual(expect.objectContaining({ success: true }));

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.changed.example",
        port: 587,
        secure: false,
        auth: { user: "new@example.com", pass: "new-secret" },
      }),
    );
    expect(verify).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("does not save settings when the mandatory connection check fails", async () => {
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      verify: jest.fn().mockRejectedValue({ code: "EAUTH" }),
      close: jest.fn(),
    });
    const { service, repository } = createService();

    await expect(
      service.save({
        host: "smtp.example.com",
        port: 465,
        secure: true,
        username: "portal@example.com",
        password: "wrong",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("encrypts a verified password before saving it", async () => {
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      verify: jest.fn().mockResolvedValue(true),
      close: jest.fn(),
    });
    const { service, repository } = createService();

    await service.save({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      username: "portal@example.com",
      password: "new-secret",
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordEncrypted: expect.not.stringContaining("new-secret"),
      }),
    );
  });

  it("routes portal mail through the active runtime transporter", async () => {
    const { service, mailerService } = createService();

    await service.sendMail({ to: "user@example.com", subject: "Test" });
    await service.sendMail({ to: "other@example.com", subject: "Test 2" });

    expect(mailerService.addTransporter).toHaveBeenCalledTimes(1);
    expect(mailerService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "portal@example.com",
        to: "user@example.com",
        transporterName: "runtime-smtp-settings",
      }),
    );
  });
});
