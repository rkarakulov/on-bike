/**
 * Строки проекта (формальное «вы»). Строки базы (`state.*`, `field.*`, `uiKit.*`, …) не повторяйте:
 * они уже в словаре через `mergeDictionaries`; ключ базы здесь — осознанное переопределение текста.
 */
export const ru = {
  'app.name': 'on-bike',
  'app.tagline': 'Гонки, маршруты, кофе-райды и календарь стартов в одном профиле',
  'tabs.home': 'Главная',
  'tabs.races': 'Гонки',
  'tabs.rides': 'Райды',
  'tabs.routes': 'Маршруты',
  'tabs.calendar': 'Календарь',
  'home.title': 'Главная',
  'section.races': 'Гонки',
  'section.rides': 'Кофе-райды',
  'section.routes': 'Маршруты',
  'section.calendar': 'Календарь стартов',
  'placeholder.soon': 'Раздел появится в одной из ближайших версий.',
  // регистрация (онбординг, слайс 1)
  'auth.register.title': 'Создать аккаунт',
  'auth.register.lead': 'Имя и фамилию можно указать позже в профиле.',
  'auth.register.email': 'E-mail',
  'auth.register.emailPlaceholder': 'name@mail.by',
  'auth.register.password': 'Пароль',
  'auth.register.birthDate': 'Дата рождения',
  'auth.register.birthDateHelper': 'Приложение доступно с 18 лет.',
  'auth.register.consent':
    'Соглашаюсь на обработку персональных данных, включая данные пульса и мощности из треков.',
  'auth.register.agreement':
    'Нажимая «Зарегистрироваться», вы принимаете пользовательское соглашение. В нём сказано, что другой участник может оспорить ваш результат, а уведомление об этом появится только в центре уведомлений приложения.',
  'auth.register.submit': 'Зарегистрироваться',
  'auth.register.haveAccount': 'Уже есть аккаунт?',
  'auth.signIn.action': 'Войти',
  'auth.signIn.title': 'Вход',
  'auth.signIn.toRegister': 'Создать аккаунт',
  // ошибки полей: код из контракта → текст
  'auth.field.REQUIRED': 'Заполните поле.',
  'auth.field.INVALID': 'Проверьте значение.',
  'auth.field.INVALID_EMAIL': 'Проверьте e-mail: в адресе ошибка.',
  'auth.field.TOO_SHORT': 'Не короче {min} символов.',
  'auth.field.TOO_LONG': 'Слишком длинное значение.',
  'auth.field.INVALID_DATE': 'Проверьте дату рождения.',
  'auth.field.AGE_BELOW_18': 'Регистрация доступна с 18 лет.',
  'auth.field.CONSENT_REQUIRED': 'Нужно согласие на обработку персональных данных.',
  'auth.field.EMAIL_TAKEN': 'Этот e-mail уже зарегистрирован.',
  'auth.field.EMAIL_UNAVAILABLE': 'Этот e-mail нельзя использовать для регистрации.',
  // ошибки действий (мутаций)
  'auth.error.network': 'Нет соединения. Проверьте подключение к интернету и повторите.',
  'auth.error.rateLimited': 'Слишком много попыток. Попробуйте позже.',
  'auth.error.unknown': 'Что-то пошло не так. Попробуйте ещё раз.',
  // «Подтвердите e-mail»
  'auth.kicker': 'Регистрация',
  'auth.checkEmail.title': 'Подтвердите e-mail',
  'auth.checkEmail.message':
    'Мы отправили письмо на {email}. Откройте ссылку из письма на этом телефоне — приложение продолжит регистрацию.',
  'auth.checkEmail.hint': 'Ссылка действует 24 часа. Письмо не пришло? Проверьте папку «Спам».',
  'auth.checkEmail.resend': 'Отправить письмо ещё раз',
  'auth.checkEmail.resendAgain': 'Отправить ещё раз',
  'auth.checkEmail.resent': 'Письмо отправлено ещё раз.',
  'auth.checkEmail.cooldown': 'Повторно — через {time}',
  'auth.checkEmail.tooMany': 'Слишком много писем. Попробуйте позже.',
  'auth.checkEmail.wrongEmail': 'Ошиблись в адресе?',
  'auth.checkEmail.backToRegister': 'Вернуться к регистрации',
  'auth.verified.title': 'E-mail подтверждён',
  'auth.verified.signingIn': 'Входим в аккаунт {email} — пароль вводить заново не нужно.',
  'auth.verified.otherDevice':
    'Адрес {email} подтверждён. Войдите на устройстве, где регистрировались: вход произойдёт без пароля.',
  'auth.signInRequired.title': 'Войдите в аккаунт',
  'auth.signInRequired.message':
    'Регистрация на этом устройстве завершилась. Если вы подтвердили e-mail, войдите с паролем.',
  // ссылка из письма
  'auth.verify.title': 'Подтвердите e-mail',
  'auth.verify.message':
    'Аккаунт {email}. Нажмите кнопку, чтобы подтвердить адрес и продолжить регистрацию.',
  'auth.verify.confirm': 'Подтвердить e-mail',
  'auth.expired.title': 'Ссылка устарела',
  'auth.expired.message':
    'Ссылка для подтверждения действует 24 часа. Отправим новое письмо на {email}.',
  'auth.expired.resend': 'Отправить новое письмо',
  'auth.expired.sent': 'Новое письмо отправлено на {email}.',
  'auth.expired.toSignIn': 'Вернуться ко входу',
  'auth.gone.title': 'Ссылка больше не действует',
  'auth.gone.message': 'Возможно, аккаунт не подтвердили вовремя. Зарегистрируйтесь ещё раз.',
  'auth.gone.toRegister': 'К регистрации',
  'apiStatus.ok': 'Работает',
  'apiStatus.degraded': 'Работает с ограничениями',
  'admin.title': 'Панель организатора',
  'admin.apiStatus': 'Статус API',
  'landing.openInApp': 'Открыть в приложении',
} as const;
