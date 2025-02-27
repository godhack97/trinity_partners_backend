export const emailSendConfig = ({ link }: { link: string}) => ({
  'email.confirmation': {
    subject: 'Регистрация пользователя',
    //text: `Подтвердите почту по ссылке: ${ link }`,
    html: `<b>Подтвердите почту по ссылке:</b> <a href="${ link }">${ link }</a>`,
    link,
    template: 'registration-start',
    context: {
      link
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
    }
  }
})