export const emailSendConfig = ({ link, URL }: { link: string, URL: string }) => ({
  'email.confirmation': {
    subject: 'Регистрация пользователя',
    //text: `Подтвердите почту по ссылке: ${ link }`,
    html: `<b>Подтвердите почту по ссылке:</b> <a href="${ link }">${ link }</a>`,
    link,
    template: 'registration-start',
    context: {
      link,
      URL,
    }
  },
  recovery: {
    subject: 'Восстановление пароля',
    //text: `Восстановите пароль по ссылке: ${ link }`,
    html: `<b>Востановите пароль по ссылке:</b> <a href="${ link }">${ link }</a>`,
    link,
    template: 'recover',
    context: {
      link,
      URL,
    }
  }
})