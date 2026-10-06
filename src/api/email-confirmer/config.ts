export const emailSendConfig = ({
  link,
  partnerName,
  partnerEmail,
}: {
  link?: string;
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
      `Чтобы восстановить пароль, откройте ссылку:\n\n${link}\n\n` +
      "Ссылка действует 1 час. Если она не открывается по нажатию, " +
      "скопируйте адрес целиком и вставьте его в браузер.",
    link,
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
