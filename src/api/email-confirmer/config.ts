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
    html: `<b>Подтвердите адрес электронной почты:</b> <a href="${link}">Подтвердить почту</a>`,
    text: `Здравствуйте!\n\nВы отправили заявку для регистрации на партнёрском портале Тринити. Чтобы подтвердить адрес электронной почты и активировать учётную запись, откройте ссылку:\n${link}\n\nЕсли вы не регистрировались на портале, просто проигнорируйте это письмо.`,
    link,
    template: "registration-start",
    context: { link },
  },
  recovery: {
    subject: "Восстановление пароля",
    html: `<b>Восстановите пароль:</b> <a href="${link}">Восстановить пароль</a>`,
    text: `Чтобы восстановить пароль на партнёрском портале Тринити, откройте ссылку:\n${link}\n\nЕсли вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.`,
    link,
    template: "recover",
    context: { link },
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
