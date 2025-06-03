export const emailSendConfig = ({
  link,
  partnerName,
  partnerEmail,
}: {
  link?: string,
  partnerName?: string,
  partnerEmail?: string
}) => ({
  'email.confirmation': {
    subject: 'Регистрация пользователя',
    html: `<b>Подтвердите почту по ссылке:</b> <a href="${link}">${link}</a>`,
    link,
    template: 'registration-start',
    context: { link }
  },
  recovery: {
    subject: 'Восстановление пароля',
    html: `<b>Востановите пароль по ссылке:</b> <a href="${link}">${link}</a>`,
    link,
    template: 'recover',
    context: { link }
  },
  'notify.new.partner': {
    subject: 'Зарегистрирован новый партнёр',
    html: `<b>Зарегистрирован новый партнёр:</b><br>
           Имя: <b>${partnerName}</b><br>
           Email: <a href="mailto:${partnerEmail}">${partnerEmail}</a>`,
    template: 'new-partner-notification',
    context: {
      partnerName,
      partnerEmail
    }
  }
});
