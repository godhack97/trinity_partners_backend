export const emailSendConfig = ({
  link,
  recoveryCode,
  partnerName,
  partnerEmail,
}: {
  link?: string;
  recoveryCode?: string;
  partnerName?: string;
  partnerEmail?: string;
}) => ({
  "email.confirmation": {
    subject: "Регистрация пользователя",
    html: `<b>Подтвердите почту по ссылке:</b> <a href="${link}">${link}</a>`,
    link,
    template: "registration-start",
    context: { link },
  },
  recovery: {
    subject: "Восстановление пароля",
    text:
      `Код восстановления пароля: ${recoveryCode}\n\n` +
      "Введите этот код на странице восстановления пароля в портале.\n" +
      "Код действует 1 час.",
  },
  "notify.new.partner": {
    subject: "Зарегистрирован новый партнёр",
    html: `<b>Зарегистрирован новый партнёр:</b><br>
           Имя: <b>${partnerName}</b><br>
           Email: <a href="mailto:${partnerEmail}">${partnerEmail}</a>`,
    template: "new-partner-notification",
    context: {
      partnerName,
      partnerEmail,
    },
  },
});
