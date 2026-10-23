// Дизайн-система @rkarakulov/ui с брендом on-bike: темы Jersey Aura / Night Ride, шрифты Inter и
// Playfair Display, словарь on-bike. Модуль импортируется первым — в src/app/_layout.tsx и jest.setup.ts:
// без configureDesignSystem компоненты базы бросают ошибку при рендере.
import { themes } from '@on-bike/design-tokens';
import { i18n } from '@on-bike/i18n';
import { configureDesignSystem } from '@rkarakulov/ui';

import { fontFamilies } from './fonts';

configureDesignSystem({ themes, fonts: fontFamilies, i18n });
