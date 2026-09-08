import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { MailerService } from "@nestjs-modules/mailer";
import { SmtpSettingEntity } from "@orm/entities";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import * as nodemailer from "nodemailer";
import { Repository } from "typeorm";
import { SmtpSettingsDto } from "./dto/smtp-settings.dto";

const SETTINGS_ID = 1;

type ResolvedSmtpSettings = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
};

@Injectable()
export class SmtpSettingsService {
  private readonly logger = new Logger(SmtpSettingsService.name);
  private activeTransportFingerprint?: string;
  private readonly runtimeTransportName = "runtime-smtp-settings";

  constructor(
    @InjectRepository(SmtpSettingEntity)
    private readonly repository: Repository<SmtpSettingEntity>,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  async getPublicSettings() {
    const stored = await this.repository.findOneBy({ id: SETTINGS_ID });
    if (stored) {
      return {
        configured: true,
        source: "database",
        host: stored.host,
        port: stored.port,
        secure: stored.secure,
        username: stored.username,
        hasPassword: Boolean(stored.passwordEncrypted),
        updatedAt: stored.updatedAt,
      };
    }

    const env = this.getEnvironmentSettings();
    return {
      configured: false,
      source: "environment",
      host: env.host,
      port: env.port,
      secure: env.secure,
      username: env.username,
      hasPassword: Boolean(env.password),
      updatedAt: null,
    };
  }

  async verify(data: SmtpSettingsDto) {
    const settings = await this.resolveSubmittedSettings(data);
    await this.verifyConnection(settings);
    return { success: true, message: "Подключение к SMTP успешно проверено" };
  }

  async save(data: SmtpSettingsDto) {
    const settings = await this.resolveSubmittedSettings(data);

    // Проверка на сервере обязательна при каждом сохранении: результат отдельной
    // кнопки в интерфейсе нельзя подменить запросом из браузера.
    await this.verifyConnection(settings);

    await this.repository.save(
      this.repository.create({
        id: SETTINGS_ID,
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        username: settings.username,
        passwordEncrypted: this.encrypt(settings.password),
      }),
    );

    this.logger.log(`SMTP settings updated for ${settings.username}`);
    return this.getPublicSettings();
  }

  async sendMail(options: Parameters<MailerService["sendMail"]>[0]) {
    const settings = await this.getActiveSettings();
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(settings))
      .digest("hex");

    if (this.activeTransportFingerprint !== fingerprint) {
      this.mailerService.addTransporter(
        this.runtimeTransportName,
        this.transportOptions(settings),
      );
      this.activeTransportFingerprint = fingerprint;
    }

    return this.mailerService.sendMail({
      ...options,
      from: settings.username,
      transporterName: this.runtimeTransportName,
    });
  }

  private async getActiveSettings(): Promise<ResolvedSmtpSettings> {
    const stored = await this.repository.findOneBy({ id: SETTINGS_ID });
    if (!stored) return this.getEnvironmentSettings();

    return {
      host: stored.host,
      port: stored.port,
      secure: stored.secure,
      username: stored.username,
      password: this.decrypt(stored.passwordEncrypted),
    };
  }

  private async resolveSubmittedSettings(
    data: SmtpSettingsDto,
  ): Promise<ResolvedSmtpSettings> {
    const host = data.host.trim();
    const username = data.username.trim();
    const suppliedPassword = data.password?.length ? data.password : undefined;
    let password = suppliedPassword;

    if (!password) {
      const active = await this.getActiveSettings();
      if (active.username === username) password = active.password;
    }

    if (!password) {
      throw new BadRequestException("Введите пароль SMTP");
    }

    return {
      host,
      port: data.port,
      secure: data.secure,
      username,
      password,
    };
  }

  private async verifyConnection(settings: ResolvedSmtpSettings) {
    const transport = this.createTransport(settings);
    try {
      await transport.verify();
    } catch (error) {
      this.logger.warn(
        `SMTP connection check failed for ${settings.username}: ${this.errorCode(error)}`,
      );
      throw new BadRequestException(this.connectionErrorMessage(error));
    } finally {
      transport.close();
    }
  }

  private createTransport(settings: ResolvedSmtpSettings) {
    return nodemailer.createTransport(this.transportOptions(settings));
  }

  private transportOptions(settings: ResolvedSmtpSettings) {
    return {
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: {
        user: settings.username,
        pass: settings.password,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    };
  }

  private getEnvironmentSettings(): ResolvedSmtpSettings {
    return {
      host: String(this.configService.get("EMAIL_HOST") || "").trim(),
      port: Number(this.configService.get("EMAIL_PORT")) || 465,
      secure: String(this.configService.get("EMAIL_SECURE")) === "true",
      username: String(this.configService.get("EMAIL_USERNAME") || "").trim(),
      password: String(this.configService.get("EMAIL_PASSWORD") || ""),
    };
  }

  private encryptionKey() {
    const secret =
      this.configService.get<string>("SMTP_SETTINGS_ENCRYPTION_KEY") ||
      this.configService.get<string>("EMAIL_PASSWORD");
    if (!secret) {
      throw new InternalServerErrorException(
        "Не настроен ключ шифрования SMTP_SETTINGS_ENCRYPTION_KEY",
      );
    }
    return createHash("sha256").update(secret).digest("hex").slice(0, 32);
  }

  private encrypt(value: string) {
    const iv = randomBytes(12).toString("hex");
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey(), iv);
    const encrypted = cipher.update(value, "utf8", "hex") + cipher.final("hex");
    return [iv, cipher.getAuthTag().toString("hex"), encrypted].join(".");
  }

  private decrypt(value: string) {
    try {
      const [ivValue, tagValue, encryptedValue] = value.split(".");
      const decipher = createDecipheriv(
        "aes-256-gcm",
        this.encryptionKey(),
        ivValue,
      );
      const authTag = new Uint8Array(
        tagValue.match(/.{2}/g).map((byte) => parseInt(byte, 16)),
      );
      decipher.setAuthTag(authTag);
      return (
        decipher.update(encryptedValue, "hex", "utf8") +
        decipher.final("utf8")
      );
    } catch {
      throw new InternalServerErrorException(
        "Не удалось расшифровать сохранённый пароль SMTP",
      );
    }
  }

  private errorCode(error: unknown) {
    return typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code || "unknown")
      : "unknown";
  }

  private connectionErrorMessage(error: unknown) {
    const code = this.errorCode(error);
    if (["EAUTH", "535"].includes(code)) {
      return "SMTP отклонил логин или пароль";
    }
    if (["ETIMEDOUT", "ESOCKETTIMEDOUT"].includes(code)) {
      return "SMTP-сервер не ответил вовремя";
    }
    if (["ECONNREFUSED", "ENOTFOUND", "EHOSTUNREACH"].includes(code)) {
      return "Не удалось подключиться к SMTP-серверу. Проверьте адрес и порт";
    }
    return "Не удалось проверить подключение к SMTP. Проверьте введённые данные";
  }
}
