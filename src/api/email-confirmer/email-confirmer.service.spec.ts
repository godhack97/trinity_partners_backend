import { EmailConfirmerService } from "./email-confirmer.service";

describe("EmailConfirmerService", () => {
  it("sends registration confirmation with a readable plain-text alternative", async () => {
    const smtpSettingsService = {
      sendMail: jest.fn().mockResolvedValue({ messageId: "test-message" }),
    };
    const configService = {
      get: jest.fn((key: string) =>
        key === "FRONTEND_HOSTNAME" ? "partner.example.test" : undefined,
      ),
    };
    const resetHashRepository = {
      save: jest.fn().mockResolvedValue(undefined),
    };
    const service = new EmailConfirmerService(
      smtpSettingsService as any,
      configService as any,
      resetHashRepository as any,
      {} as any,
    );

    await service.send({
      user_id: 42,
      email: "user@example.com",
      method: "email.confirmation",
    });

    expect(resetHashRepository.save).toHaveBeenCalledTimes(1);
    const savedHash = resetHashRepository.save.mock.calls[0][0].hash;
    const expectedLink =
      "https://partner.example.test/email.confirmation" +
      `?email=user%40example.com&verify=${savedHash}`;

    expect(smtpSettingsService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Регистрация пользователя",
        template: "registration-start--img-as-base64.hbs",
        text: expect.stringContaining(expectedLink),
        context: expect.objectContaining({ link: expectedLink }),
      }),
    );
    expect(smtpSettingsService.sendMail.mock.calls[0][0].text).toContain(
      "Чтобы подтвердить адрес электронной почты",
    );
  });
});
