# Текст и иконки под стеклом

Задача: символы снаружи сохраняют обычный цвет, а часть, на которую находит стекло, становится активного цвета и преломляется вместе с линзой. Это пиксельная композиция материала. Настоящее выделение текста пользователем, копирование и DOM Selection остаются функциями приложения.

## Два согласованных источника

`setBackdrop` содержит всё обычное изображение. `setVibrancySource` получает прозрачную маску только тех букв и иконок, цвет которых разрешено менять. Маска покрывает тот же viewport, в тех же координатах. У surface нужен `vibrancy:true`.

```ts
const width = 800, height = 400, ratio = devicePixelRatio;
const background = document.createElement('canvas');
const mask = document.createElement('canvas');
background.width = mask.width = Math.round(width * ratio);
background.height = mask.height = Math.round(height * ratio);
const bg = background.getContext('2d')!;
const ink = mask.getContext('2d')!;
bg.scale(ratio, ratio); ink.scale(ratio, ratio);

function drawSymbols(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color;
  ctx.font = '48px Georgia';
  ctx.fillText('Light, in motion.', 60, 180);
  // Любой SVG/Path2D, изображение с альфой или другой текст:
  ctx.fill(new Path2D('M 80 230 L 98 248 L 80 266 L 62 248 Z'));
}
bg.fillStyle = '#e7edf4'; bg.fillRect(0, 0, width, height);
drawSymbols(bg, '#253c56');
drawSymbols(ink, 'white');

renderer.setBackdrop(background);
renderer.setVibrancySource(mask, {color: [0.05, 0.45, 1]});
const lens = renderer.addSurface({
  id: 'text-lens', vibrancy: true,
  rect: {x: 140, y: 125, width: 190, height: 90, radius: 45},
  material: {variant: 'clear', frost: .02, edgeWidth: 4,
    magnification: 1.08, appearance: 'light'},
});
```

Шейдер сначала вычисляет фактическую границу стекла, затем искажённую координату изображения. По этой же координате читает маску. Окрашивание смешивается по её альфе и ограничивается покрытием поверхности. Поэтому внутри искажённой буквы цвет совпадает с её новой формой, а снаружи стекла пиксели не меняются. Это работает и для свободного SVG-контура с отверстиями.

## Несколько активных цветов

Без `options.color` foreground содержит готовые RGBA-цвета. Нарисуйте синие буквы, зелёный значок, белую подпись — каждый сохранит цвет внутри линзы. Цветной источник заменяет исходник только по собственной альфе, а не перекрашивает всю подложку.

```ts
ink.clearRect(0, 0, width, height);
drawSymbols(ink, '#2588ff');
renderer.setVibrancySource(mask); // использовать RGB каждого пикселя
```

Повторный вызов `setVibrancySource` отмечает изменённые пиксели для upload. Движение стекла повторно маску не загружает. Для отключения: `renderer.setVibrancySource(null)` или создайте поверхность без vibrancy.

## Иконка под бейджем

Если бейдж должен остаться красным, он рисуется в обычном содержимом и вырезается из маски иконки. Иначе активный цвет может оказаться поверх бейджа.

```ts
ink.save();
ink.globalCompositeOperation = 'destination-out';
ink.beginPath(); ink.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 12);
ink.fill(); ink.restore();
renderer.setVibrancySource(mask, {color: [0.05, .45, 1]});
```

## Маска и стеклянные слои

У renderer одна общая полноразмерная маска. Она не привязана к выбранной кнопке или фону; любая surface с vibrancy использует её через свою оптику. Если движется текст на задней панели, его маска должна перемещаться/обновляться вместе с панелью в viewport-координатах. `surface.content` задаёт локальные пиксели панели, но автоматически не регистрирует их как глобальную маску.

Для сложного интерфейса делите независимые сцены на renderer либо собирайте общую маску из семантических слоёв приложения. Части, которые нельзя окрашивать, оставляйте прозрачными. Разные glass groups могут одновременно пересекать один и тот же текст.

## DOM и доступность

Обычный DOM-текст поверх WebGL-canvas не является пикселями под ним. Сам по себе `vibrancy:true` не позволяет прочитать чужие DOM-элементы. Выберите согласованный способ:

1. Приложение рисует видимые символы и маску одной функцией Canvas2D, как выше. Поверх остаются семантические hit targets/доступные подписи без второй видимой копии текста.
2. На браузере с HTML-in-Canvas используйте отдельный drawable source canvas и `bindDomBackdrop`; для active foreground нужен собственный прозрачный drawable слой. Класс с активным цветом задаётся на этом слое. Проверяйте `supportsDomBackdrop()`.
3. Для неподдерживаемого WebView передайте explicit bitmap/canvas из модели интерфейса или используйте CSS fallback.

Шрифт необходимо загрузить до рисования: `await document.fonts.ready`. Размеры обоих источников пересоздаются при resize/DPR, после чего символы рисуются заново. При scroll их координаты должны соответствовать видимому кадру, а не исходному document offset.

## Что проверить, если цвет не совпадает

- У поверхности установлен vibrancy, маска загружена и имеет ненулевую альфу только на символах.
- Источник и маска используют один viewport, crop, scroll offset, шрифт и baseline.
- При построении пиксельного canvas контекст масштабирован один раз; после изменения width/height его transform сбрасывается.
- Для резких символов подходит Clear или небольшой frost. Маска сама по себе не размывается frost: это intentional active foreground для читаемости.
- Magnification меняет положение символов внутри линзы. Для сохранения масштаба задайте 1; окрашивание всё равно останется локальным.

Полный рабочий пример: [Программируемая линза](../examples/programmatic/), исходник `examples/programmatic/main.ts`.
