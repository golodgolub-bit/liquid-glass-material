# Liquid Glass Material

[Исходники](https://github.com/golodgolub-bit/liquid-glass-material) · [Сборки](https://github.com/golodgolub-bit/liquid-glass-material/releases) · MIT

**v0.6:** открытые GLSL-проходы и uniforms, все каналы пружин, собственная деформация, импульсы и CPU/GPU-расчёт лучей через две границы. [Стенд разработчика](http://127.0.0.1:5173/examples/workbench/) · [Программирование](docs/programmability.md) · [Сверка с iPadOS 27](docs/apple-audit.md).

Переносимый GPU-материал и небольшая библиотека контролов, вдохновлённые Apple Liquid Glass. TypeScript, WebGL 2, без зависимостей во время выполнения. Работает в веб-приложениях и интерфейсах внутри Electron, WebView2 и Android WebView.

**Это независимая реализация, а не исходный материал Apple.** Точное совпадение с закрытыми шейдерами, системным композитором и всеми версиями iOS не установлено. Windows и Android подключаются через WebView; нативных Compose/WinUI-рендереров в этой версии нет.

**Документация:** [руководство](docs/index.md), [полный API](docs/api.md), [текст под стеклом](docs/text-under-glass.md), [постоянные анимации](docs/animations.md), [отражения](docs/reflections.md), [интеграция](docs/integration.md). После `npm run dev` читаемый сайт доступен по `/docs/`, живой программируемый пример — `/examples/programmatic/`.

## Быстрый запуск

```sh
npm ci
npm run dev
```

Откройте http://127.0.0.1:5173/#motion-studio. Выберите сцену и взаимодействуйте с ней: зажим и перетаскивание, стекло поверх другого стекла, свободные контуры, кнопка → меню, слияние, проявление, контролы, навигация, прокрутка, поиск и sheet. **Replay / Watch all interactions** запускают показ только по нажатию; прокрутка и выбор сцены не запускают анимацию. Ниже — лаборатория оптики с импортом изображений и видео.

```sh
npm run build           # ESM, sourcemap, CSS и TypeScript declarations → dist/
npm run build:demo      # самостоятельная демонстрация → dist-demo/
npm run build:docs      # сайт документации → public/docs/
npm run build:hosts     # подготовка ресурсов примеров Windows / Android
npm test               # физика и контракты параметров
npm run test:browser    # настоящий WebGL, пиксели, взаимодействия, восстановление контекста
npm pack               # локальный пакет для установки в другое приложение
```

Если Chromium ещё не установлен: `npx playwright install chromium`. На рабочей машине тесты автоматически находят существующий Chromium Playwright; можно передать `CHROMIUM_PATH`.

## Что реализовано

- Явная модель материала: Regular, Clear, Identity, оптическая толщина, преломление, дисперсия, рассеивание, насыщенность, поглощение оттенком, направленный свет, подсветка касания и тени.
- Аналитический SDF и его градиент: округлённые прямоугольники, круги, капсулы и плавное объединение до 32 форм в группе. Блик и преломление следуют общей границе, без внутренних швов.
- Произвольные SVG-контуры, включая вогнутые участки и отверстия; морфинг дистанционных полей и проверка попадания в реальный контур.
- Композиция с порядком `layer`: передняя поверхность преломляет уже нарисованное заднее стекло и его локальное содержимое `content`.
- Два уровня плотного Gaussian-размытия. Исходный фон кэшируется; при наложении дополнительные blur-проходы обрабатывают снимок задних слоёв.
- Аналитические пружины с сохранением скорости при смене цели; деформация при нажатии и оптическое появление материала.
- Адаптация Regular по низкоразмерной выборке фона: светлый/тёмный материал, цвет текста, усиление тени на неоднородном фоне. У больших поверхностей тон фиксируется, чтобы избежать резких переключений.
- Доступность: prefers-reduced-motion, prefers-reduced-transparency, prefers-contrast; явные переопределения для нативного хоста и CSS для forced-colors.
- Рендер по необходимости; остановка в фоне; восстановление потерянного WebGL-контекста; освобождение ресурсов.
- Семантические DOM-кнопка, переключатель, слайдер и навигация. Можно привязать существующие элементы через `bindElement`.
- Примеры Windows WPF + WebView2 и Android Java + WebViewAssetLoader.

## Подключение

После `npm pack` установите полученный архив в свой проект:

```sh
npm install /path/to/liquid-glass-material-0.6.0.tgz
```

```ts
import { GlassRenderer, bindElement, observeSize } from '@liquid-glass/material';
import '@liquid-glass/material/style.css';

const glass = new GlassRenderer(canvas, { quality: 'balanced' });
const stopResize = observeSize(glass);

// backgroundCanvas должен содержать то изображение, которое видно под стеклом.
// Масштабирование: исходник растягивается на размеры canvas рендерера.
glass.setBackdrop(backgroundCanvas);

const button = bindElement(glass, document.querySelector<HTMLButtonElement>('#save')!, {
  id: 'save', radius: 28,
  material: { variant: 'regular', tint: [0.2, 0.5, 1], tintOpacity: 0.3 },
});

// После изменения пикселей исходного canvas:
glass.updateBackdrop();

// При размонтировании, сначала привязки, затем рендерер:
button.dispose();
stopResize();
glass.dispose();
```

Рекомендуемая структура: контейнер `position: relative`, canvas `position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none`, поверх него настоящие DOM-элементы. Текст и иконки не растеризуются шейдером и остаются доступны скринридеру.

**Источники изображения:** передайте canvas, загруженное изображение или видео с разрешённым CORS. На Chromium/Edge 157+ доступен живой DOM через `bindDomBackdrop` и HTML-in-Canvas — см. ниже. Это относится к поддереву вашего приложения внутри выделенного source canvas; чужая страница и нативное окно автоматически недоступны. На остальных браузерах остаются явный canvas/image/video или CSS-класс `lg-fallback` без оптического преломления. Для React используйте `bindElement` в `useLayoutEffect` и освобождайте привязку в cleanup.

## Прямое управление материалом и формой

```ts
const a = glass.addSurface({
  id: 'a', group: 'tools', spacing: 32,
  rect: { x: 40, y: 80, width: 90, height: 90, radius: 45 },
  material: { variant: 'regular' }, materialize: true,
});
const b = glass.addSurface({
  id: 'b', group: 'tools', // материал и spacing наследуются от группы
  rect: { x: 150, y: 80, width: 90, height: 90, radius: 45 },
});
b.move({ x: 118 });                // пружинное движение и слияние общей границы
a.material({ refraction: 18 });    // меняет всю группу
a.interact(true, 85, 115);         // glow и упругая реакция
a.interact(false);
```

Каждая группа использует один материал, режим vibrancy и один spacing. Разные материалы в одной группе отклоняются. Числа координат и оптических размеров задаются в CSS-пикселях независимо от DPR. `move(rect, false)` задаёт геометрию без анимации. `identity` исключает поверхность из рендера материала.

## Слои, содержимое и произвольный контур

```ts
import { createGlassShape } from '@liquid-glass/material';

const rear = glass.addSurface({
  id: 'rear', layer: 0,
  rect: { x: 40, y: 60, width: 300, height: 180, radius: 28 },
  content: labelsCanvas, // локальный RGBA canvas размером с панель
});
const drop = createGlassShape({
  viewBox: [100, 100],
  path: 'M 50 4 C 65 30 94 43 94 65 C 94 90 74 96 50 96 C 25 96 6 88 6 64 C 7 44 36 28 50 4 Z',
});
const front = glass.addSurface({
  id: 'front', layer: 1, shape: drop,
  rect: { x: 100, y: 80, width: 160, height: 160, radius: 40 },
  material: { variant: 'clear', frost: 0, magnification: 1.12 },
});
await front.shape(null); // плавно вернуться к rect.radius
front.contains(150, 120); // CSS-координаты renderer, учитывает отверстия и morph
rear.content(updatedLabelsCanvas); // вызвать после изменения локальных пикселей

// Маска любых семантических символов/текста. Цвет меняется только внутри линзы.
glass.setVibrancySource(textMaskCanvas, { color: [0.05, 0.45, 1] });
```

`layer` сортируется от меньшего к большему, одинаковые значения сохраняют порядок добавления. Члены объединённой группы имеют один layer. `content` рисуется после материала в локальных координатах поверхности; при перемещении следует за ней и становится частью изображения для переднего стекла. DOM-текст поверх canvas автоматически туда не попадает: предоставьте его RGBA-изображение либо используйте поддерживаемый DOM backdrop. Доступные DOM-кнопки остаются отдельными hit targets.

`createGlassShape` строит поле 256×256 один раз при создании, затем оно хранится на GPU. Поддерживаются SVG curves и `fillRule: 'evenodd'`; большой масштаб ограничен разрешением поля. `shape(path, { immediate: true })` меняет контур сразу; по умолчанию дистанционные поля смешиваются пружиной. Прерывание сохраняет текущую границу приблизительно на точность поля, но не гарантирует сохранение скорости каждой точки контура. Для деформации движения используется прежняя анимация `rect`. Оригинальная динамика Apple не измерена до пикселя.

## Анимации и жизненный цикл

```ts
import { motionPresets } from '@liquid-glass/material';

await a.animateTo(
  { x: 160, width: 260, height: 220, radius: 28 },
  { spring: motionPresets.fluid },
);

// Параметры материала теперь также изменяются пружинами.
a.material({ frost: 0.12, refraction: 22, magnification: 1.2 });
await a.settled();

await a.hide();           // геометрия + оптическое растворение
await a.show();           // обратный переход, в том числе после прерывания
await a.dismiss();        // исчезновение с последующим удалением
```

Результат анимации — `{ finished: boolean }`. Смена цели и удаление разрешают прерванные ожидания с `finished: false`. Текущая позиция и скорость сохраняются. `.state` возвращает rect, visualRect, visibility, pressed, energy, moving и текущие оптические параметры. `bindElement` синхронизирует visualRect с translate/scale/opacity настоящего DOM, поэтому надписи деформируются вместе с материалом. Эти inline-свойства принадлежат привязке до `dispose()`; исходные значения затем восстанавливаются.

Касание включает пружинный подъём, небольшое притяжение к месту нажатия, затухающую подсветку и движущийся блик. Быстрое движение растягивает поверхность по скорости. `elastic: false` оставляет панели жёсткими. Reduced Motion отключает эти деформации и немедленно завершает перемещение.

## Готовые контролы

```ts
import { glassButton, glassToggle, glassSlider, glassTabs } from '@liquid-glass/material';

const action = glassButton(glass, toolbar, 'Сохранить');
action.element.addEventListener('click', save);

const toggle = glassToggle(glass, toolbar, 'Уведомления', true);
toggle.element.addEventListener('change', () => setNotifications(toggle.checked));

const slider = glassSlider(glass, toolbar, 'Громкость', 60, { min: 0, max: 100 });
slider.input.addEventListener('input', () => setVolume(+slider.input.value));

const nav = glassTabs(glass, toolbar, ['Медиатека', 'Коллекции', 'Поиск']);
nav.element.addEventListener('change', () => navigate(nav.selectedIndex));

// Каждый control возвращает element, surface, refresh(), dispose().
```

У переключателя, слайдера и навигации материал применяется к движущемуся thumb/индикатору. Они меняют оптическое состояние на удержании и поддерживают клавиатуру. Сначала добавляйте контролы в видимый контейнер с рассчитанным layout. `bindElement` следит за размером, прокруткой и размером окна. После перемещения элемента из-за изменения соседней вёрстки вызывайте `refresh(true)` для перехода. CSS transforms для корневого canvas не поддерживаются.

## Меню, поиск и sheet

```ts
import { glassPopover, glassSearch, glassSheet } from '@liquid-glass/material';

const menu = glassPopover(glass, moreButton, [
  { label: 'Поделиться', onSelect: share },
  { label: 'Добавить в коллекцию', onSelect: collect },
], { parent: overlay, width: 260 });
await menu.open();        // тот же оптический объект вырастает из кнопки
await menu.close();       // возвращается в её актуальную позицию

const search = glassSearch(glass, toolbar, { placeholder: 'Найти', width: 340 });
await search.expand();
search.input.addEventListener('input', onSearch);
await search.collapse();

const sheet = glassSheet(glass, detailsButton, detailsContent, { parent: overlay });
await sheet.open();
await sheet.setDetent('large');
await sheet.close();
```

`overlay` должен быть позиционированным контейнером, совпадающим с viewport canvas. Меню поддерживает стрелки, Escape, клик снаружи и возврат фокуса. Sheet ограничивает Tab своим содержимым, меняет плотность при переходе к большому состоянию и возвращается к исходной кнопке. Поиск содержит настоящий input. Каждый контроллер освобождается через `dispose()`.

## Навигационная линза и яркий передний план

```ts
import { bindLiquidSelection } from '@liquid-glass/material';

// Прозрачный полноразмерный RGBA-слой с активными иконками и бейджами.
glass.setVibrancySource(activeSymbolsCanvas);
const navigation = bindLiquidSelection(glass, navElement, {
  id: 'navigation', items: navButtons, initialIndex: 0,
  onSelect: index => navigate(index),
});
```

Линза поднимается над rail на удержании, следует за пальцем, увеличивает и преломляет содержимое, затем садится на выбранный пункт. `vibrancy: true` на произвольной поверхности включает наложение переднего RGBA-слоя через ту же преломлённую UV-координату. Один renderer имеет один такой общий слой. `magnification` материала (1–2) управляет увеличением внутри линзы отдельно от изгиба её края. Иконки не рисуются поверх линзы: для эффекта из третьего референса они должны быть частью фонового/foreground-изображения. В сцене Navigation lens показан полный пример этой композиции.

## Живой HTML за стеклом

```html
<canvas id="source" content="drawable">
  <article id="content" drawable><!-- ваш HTML --></article>
</canvas>
<canvas id="glass"></canvas>
```

```ts
import { bindDomBackdrop, supportsDomBackdrop } from '@liquid-glass/material';

if (supportsDomBackdrop()) {
  const dom = bindDomBackdrop(glass, sourceCanvas, contentElement, {
    background: '#eef3f8', maxPixelRatio: 1.5,
  });
  // CSS, текст и взаимодействия обновляют общую текстуру через native paint event.
  // dom.refresh() запрашивает обновление вручную; dom.dispose() отключает привязку.
}
```

Root должен занимать весь source canvas; оба canvas имеют один CSS viewport, GPU-слой — `pointer-events: none`. Поддержка проверяется по фактическому API, а не user-agent. Пример: http://127.0.0.1:5173/examples/dom/. Проверен на Edge 157: настоящая кнопка остаётся доступна, её текст и CSS автоматически меняют пиксели фона, в покое повторных upload нет. Неподдерживаемый WebView требует прежний явный источник. Источник foreground также можно обновлять через этот адаптер с `{ foreground: true }`.

## Прокрутка и свет

```ts
import { bindScrollBehavior, bindEnvironmentLight } from '@liquid-glass/material';
const scroll = bindScrollBehavior(glass, scrollView, {
  surface: navigationSurface,
  expanded: expandedRect, collapsed: compactRect,
  edge: 'bottom', edgeExtent: 90,
  onScroll: offset => updateYourBackdrop(offset),
});
const light = bindEnvironmentLight(glass, viewport);
// Только из явного действия пользователя внутри приложения:
await light.requestDeviceOrientation();
```

Scroll behavior имеет гистерезис направления и возвращает навигацию при прокрутке вверх. `setScrollEdges({ top, bottom, left, right, hard, color })` задаёт GPU-размытие и растворение содержимого у границ. Без явного color цвет адаптируется к фону. `setLight(x,y)` теперь плавно поворачивает свет; `bindEnvironmentLight` связывает его с указателем и опционально ориентацией устройства. Все привязки возвращают `dispose()`.

## Видео

```ts
const stopVideo = glass.bindVideo(video);
// Использует requestVideoFrameCallback; неподвижное стекло обновляется по новым кадрам видео.
// Перед размонтированием:
stopVideo();
```

В старых WebView без requestVideoFrameCallback обновляйте фон сами, только когда получен новый видеокадр. Декодирование и загрузка большого видео имеют отдельную стоимость.

Поддерживаются HTMLCanvasElement, OffscreenCanvas, HTMLImageElement и HTMLVideoElement. ImageBitmap, ImageData и VideoFrame сначала нарисуйте в исходный canvas: это сохраняет единое направление координат и предсказуемую выборку для адаптации.

## Качество и измерения

`quality: 'low' | 'balanced' | 'high'` ограничивает DPR значениями 1 / 1.5 / 2; фактический DPR не превышает DPR устройства. Low отключает спектральное разделение и уменьшает буфер размытия. `maxPixelRatio` позволяет задать собственный предел. Прозрачные буферы используют premultiplied alpha.

`renderer.stats` содержит CPU-время отправки команд, draw calls, число загрузок фона, проходов blur и оценку размера текстур. **CPU-время не равно времени кадра.** `measureGpu: true` включает асинхронный EXT_disjoint_timer_query_webgl2, если он доступен; иначе GPU-время равно null. Бюджет текстур не включает внутренние копии браузера и драйвера.

```sh
npm run dev
# В другом терминале:
npm run benchmark
```

Результаты записываются в `artifacts/benchmark-default.json` с реальным названием рендерера, медианой, p95 и контрольным пустым requestAnimationFrame. Методика и ограничения: [docs/performance.md](docs/performance.md). История проверки v0.2: [docs/validation.md](docs/validation.md). Не экстраполируйте результат программного SwiftShader на Intel, Adreno, Mali или iPhone. Для реального приложения измеряйте прокрутку, видео, нагрев и p95 на целевом устройстве.

## Windows / Android

После `npm run build:hosts`:

- **Windows:** `dotnet run --project examples/windows`. Требуются .NET 8 SDK и установленный WebView2 Runtime. Ресурсы загружаются через виртуальный HTTPS-хост, действия передаются в C# через postMessage.
- **Android:** откройте `examples/android` в Android Studio, используйте JDK 17, Android SDK 36 и Gradle 8.13. Проект не включает бинарный Gradle wrapper; его можно сгенерировать установленным Gradle: `gradle wrapper --gradle-version 8.13`. Локальные ресурсы загружаются через WebViewAssetLoader. Требуются аппаратное ускорение и WebGL 2 в установленном WebView.

Хосты — примеры интеграции. Их сборка и работа на реальных устройствах в этой среде не проверены: .NET SDK и Android SDK здесь отсутствуют. Web-часть проверяется отдельными тестами.

## Исследование и границы точности

[docs/research.md](docs/research.md) содержит источники Apple, наблюдения по трём предоставленным видео и таблицу реализованного/неподтверждённого поведения. Приватные референсы не включаются в пакет или демонстрацию. Записанное воспроизведение нашей студии находится в `artifacts/motion-showcase.webm`. Материал предназначен для навигации и контролов; избегайте декоративного стекла на каждом блоке.

MIT. Названия Apple, iOS и Liquid Glass принадлежат соответствующим правообладателям; проект не связан с Apple.

## Обновление v0.3

[Изменения оптики, drag и захвата](docs/v0.3.md): Snell refraction, Fresnel и отражённый свет, плотное рассеивание без повторяющихся полос, быстрый pointer tracking с fallback и `bindMediaBackdrop` для правильной обрезки изображений/видео. В демо — Open image / video и Light & reflections.

## Обновление v0.4

[Слои, контуры и взаимодействия](docs/v0.4.md): преломление другого стекла вместе с его содержимым, SVG-контуры с отверстиями и morph, маска цветного текста/иконок, движущаяся подсветка меню, исправление контраста Clear и устранение автоперезапуска сцены во время жестов.

## Обновление v0.5

[Плоская середина и программирование](docs/v0.5.md): edgeWidth отдельно от оптической толщины, более мягкие пружины, addAnimation с pause/resume/cancel, собственная карта отражений с поворотом без upload, полный справочник и рабочий пример текста/постоянной анимации.
