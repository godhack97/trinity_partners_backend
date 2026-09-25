import { ConfigService } from "@nestjs/config";
import { ResetHashRepository, UserRepository } from "@orm/repositories";
import { EmailConfirmerService } from "./email-confirmer.service";
import { EmailConfirmerMethod } from "./types";
import { SmtpSettingsService } from "@api/admin/smtp-settings/smtp-settings.service";

describe("EmailConfirmerService resend", () => {
  const createService = () => {
    const resetHash = {
      id: 7,
      user_id: 42,
      email: "old@example.com",
      hash: "old-hash",
      expire_date: new Date(0),
    };
    const resetHashRepository = {
      findOne: jest.fn().mockResolvedValue(resetHash),
      save: jest.fn(async (value) => value),
    };
    const smtpSettingsService = {
      sendMail: jest.fn().mockResolvedValue({
        accepted: ["user@example.com"],
        rejected: [],
        messageId: "message-id",
      }),
    };
    const configService = {
      get: jest.fn().mockReturnValue("partner.example.com"),
    };

    return {
      service: new EmailConfirmerService(
        smtpSettingsService as unknown as SmtpSettingsService,
        configService as unknown as ConfigService,
        resetHashRepository as unknown as ResetHashRepository,
        {} as UserRepository,
      ),
      resetHash,
      resetHashRepository,
      smtpSettingsService,
    };
  };

  it("refreshes the confirmation token and waits for SMTP acceptance", async () => {
    const {
      service,
      resetHash,
      resetHashRepository,
      smtpSettingsService,
    } = createService();

    await expect(
      service.resend({
        user_id: 42,
        email: "user@example.com",
        method: EmailConfirmerMethod.EmailConfirmation,
      }),
    ).resolves.toEqual(expect.objectContaining({ messageId: "message-id" }));

    expect(resetHash.hash).not.toBe("old-hash");
    expect(resetHash.email).toBe("user@example.com");
    expect(new Date(resetHash.expire_date).getTime()).toBeGreaterThan(Date.now());
    expect(resetHashRepository.save).toHaveBeenCalledWith(resetHash);
    expect(smtpSettingsService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        context: expect.objectContaining({
          link: expect.stringContaining(encodeURIComponent(resetHash.hash)),
        }),
        headers: {
          "X-Campaign-Id": "registration_confirmation",
          "X-Letter-Id": `registration_${resetHash.hash}`,
        },
      }),
    );
  });

  it("returns an error when SMTP sending fails", async () => {
    const { service, smtpSettingsService } = createService();
    smtpSettingsService.sendMail.mockRejectedValueOnce(
      new Error("SMTP rejected message"),
    );

    await expect(
      service.resend({
        user_id: 42,
        email: "user@example.com",
        method: EmailConfirmerMethod.EmailConfirmation,
      }),
    ).rejects.toThrow("SMTP rejected message");
  });
});
