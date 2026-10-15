// All user-facing text lives here. Add a language by copying a block.
export const DICT = {
  uk: {
    code: 'uk', label: 'укр',
    setup: {
      eyebrow: 'Кімната',
      title: 'Познайомимось із котом',
      lede: 'Три кроки — і він оселиться у своїй кімнаті.',
      nameLabel: "Ім'я кота",
      random: 'Випадкове',
      eyeLabel: 'Колір очей',
      collarLabel: 'Нашийник',
      go: 'Заходимо',
      namePlaceholder: 'Вуглик'
    },
    ui: {
      sneeze: 'Апчхи',
      treat: 'Смаколик',
      changeCat: 'змінити кота',
      loading: 'будуємо кімнату',
      mute: 'Звук'
    },
    eyes: { amber: 'бурштиновий', green: 'зелений', blue: 'блакитний', gold: 'золотий', hazel: 'горіховий', grey: 'сірий' },
    collars: { none: 'без нашийника', red: 'червоний', cream: 'кремовий', teal: 'бірюзовий', plum: 'сливовий', mustard: 'гірчичний' },
    names: ['Вуглик', 'Мурчик', 'Бублик', 'Сірник', 'Пломбір', 'Гудзик', 'Персик', 'Тарасик'],
    status: {
      sit: '{n} сидить на столі',
      loaf: '{n} склав лапки і дивиться у простір',
      groom: '{n} вмиває лапу',
      yawn: '{n} позіхає',
      stretch: '{n} потягується',
      nap: '{n} дрімає на столі',
      walk: '{n} кудись іде',
      jumpDown: '{n} зістрибує зі столу',
      jumpUp: '{n} застрибує на стіл',
      window: '{n} дивиться у вікно',
      rug: '{n} вмостився на килимку',
      shelf: '{n} вивчає книжки',
      corner: '{n} сидить у кутку',
      plant: '{n} обнюхує рослину',
      sneeze: '{n} чхнув',
      meow: '{n} нявкає',
      purr: '{n} муркоче',
      treatWalk: '{n} почув смаколик',
      treatWave: '{n} махає лапкою',
      treatEat: '{n} хрумає смаколик',
      treatPurr: '{n} муркоче',
      back: '{n} повертається на стіл'
    }
  },

  ru: {
    code: 'ru', label: 'рус',
    setup: {
      eyebrow: 'Комната',
      title: 'Познакомимся с котом',
      lede: 'Три шага — и он поселится в своей комнате.',
      nameLabel: 'Имя кота',
      random: 'Случайное',
      eyeLabel: 'Цвет глаз',
      collarLabel: 'Ошейник',
      go: 'Заходим',
      namePlaceholder: 'Уголёк'
    },
    ui: {
      sneeze: 'Апчхи',
      treat: 'Вкусняшка',
      changeCat: 'изменить кота',
      loading: 'строим комнату',
      mute: 'Звук'
    },
    eyes: { amber: 'янтарный', green: 'зелёный', blue: 'голубой', gold: 'золотой', hazel: 'ореховый', grey: 'серый' },
    collars: { none: 'без ошейника', red: 'красный', cream: 'кремовый', teal: 'бирюзовый', plum: 'сливовый', mustard: 'горчичный' },
    names: ['Уголёк', 'Мурзик', 'Бублик', 'Персик', 'Пломбир', 'Пуговка', 'Тишка', 'Барсик'],
    status: {
      sit: '{n} сидит на столе',
      loaf: '{n} сложил лапки и смотрит в пустоту',
      groom: '{n} умывает лапу',
      yawn: '{n} зевает',
      stretch: '{n} потягивается',
      nap: '{n} дремлет на столе',
      walk: '{n} куда-то идёт',
      jumpDown: '{n} спрыгивает со стола',
      jumpUp: '{n} запрыгивает на стол',
      window: '{n} смотрит в окно',
      rug: '{n} устроился на коврике',
      shelf: '{n} изучает книжки',
      corner: '{n} сидит в углу',
      plant: '{n} обнюхивает растение',
      sneeze: '{n} чихнул',
      meow: '{n} мяукает',
      purr: '{n} мурчит',
      treatWalk: '{n} учуял вкусняшку',
      treatWave: '{n} машет лапкой',
      treatEat: '{n} хрустит вкусняшкой',
      treatPurr: '{n} мурчит',
      back: '{n} возвращается на стол'
    }
  },

  en: {
    code: 'en', label: 'eng',
    setup: {
      eyebrow: 'The room',
      title: 'Meet your cat',
      lede: 'Three steps and it moves into its room.',
      nameLabel: "Cat's name",
      random: 'Random',
      eyeLabel: 'Eye colour',
      collarLabel: 'Collar',
      go: "Let's go",
      namePlaceholder: 'Soot'
    },
    ui: {
      sneeze: 'Sneeze',
      treat: 'Treat',
      changeCat: 'change cat',
      loading: 'building the room',
      mute: 'Sound'
    },
    eyes: { amber: 'amber', green: 'green', blue: 'blue', gold: 'gold', hazel: 'hazel', grey: 'grey' },
    collars: { none: 'no collar', red: 'red', cream: 'cream', teal: 'teal', plum: 'plum', mustard: 'mustard' },
    names: ['Soot', 'Pumpkin', 'Bagel', 'Ember', 'Biscuit', 'Button', 'Peach', 'Pepper'],
    status: {
      sit: '{n} is sitting on the desk',
      loaf: '{n} is loafing, staring into space',
      groom: '{n} is washing a paw',
      yawn: '{n} is yawning',
      stretch: '{n} is stretching',
      nap: '{n} is napping on the desk',
      walk: '{n} is walking somewhere',
      jumpDown: '{n} jumps down from the desk',
      jumpUp: '{n} jumps up onto the desk',
      window: '{n} is looking out the window',
      rug: '{n} is settled on the rug',
      shelf: '{n} is studying the books',
      corner: '{n} is sitting in the corner',
      plant: '{n} is sniffing the plant',
      sneeze: '{n} sneezed',
      meow: '{n} meows',
      purr: '{n} is purring',
      treatWalk: '{n} smells a treat',
      treatWave: '{n} is waving a paw',
      treatEat: '{n} is crunching the treat',
      treatPurr: '{n} is purring',
      back: '{n} is heading back to the desk'
    }
  }
};

const LANG_KEY = 'pcr.lang.v2';
let current = 'en';

/** `remember` is true only when the visitor picked a language themselves. */
export function setLang(code, remember) {
  if (DICT[code]) current = code;
  if (remember) { try { localStorage.setItem(LANG_KEY, current); } catch (e) {} }
  document.documentElement.lang = current;
}

/** English is the default; only a language the visitor picked is restored. */
export function initLang() {
  let code = null;
  try { code = localStorage.getItem(LANG_KEY); } catch (e) {}
  setLang(DICT[code] ? code : 'en');
  return current;
}

export function lang() { return current; }
export function L() { return DICT[current]; }

/** t('ui.sneeze') or t('status.nap', {n: 'Soot'}) */
export function t(path, vars) {
  let node = DICT[current];
  for (const key of path.split('.')) {
    if (node == null) break;
    node = node[key];
  }
  if (typeof node !== 'string') return path;
  if (!vars) return node;
  return node.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}
