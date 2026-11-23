# Liquid Glass Material — руководство

Переносимый материал для WebGL 2, TypeScript и интерфейсов в WebView2, Electron и Android WebView. Библиотека управляет оптикой, геометрией, жестами и пружинами. Приложение предоставляет изображения сцены и семантическое содержимое. Это независимая реализация, а не опубликованный шейдер Apple.

## Начать за пять минут

```sh
npm install ./liquid-glass-material-0.6.0.tgz
```

```html
<div class="stage">
  <canvas id="glass" aria-hidden="true"></canvas>
  <button id="action">Сохранить</button>
</div>
<style>
.stage { position: relative; height: 400px; isolation: isolate; }
#glass { position: absolute; inset: 0; width: 100%; height: 100%; z-index: -1; }
#action { position: absolute; left: 80px; top: 120px; border: 0;
  background: transparent; padding: 14px 24px; border-radius: 28px; }
</style>
```

```ts
import { GlassRenderer, bindElement, bindDrag, observeSize }
  from '@liquid-glass/material';
import '@liquid-glass/material/style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#glass')!;
const element = document.querySelector<HTMLButtonElement>('#action')!;
const renderer = new GlassRenderer(canvas);
const stopResize = observeSize(renderer);

const source = document.createElement('canvas');
source.width = 800; source.height = 400;
const ctx = source.getContext('2d')!;
ctx.fillStyle = '#dbe8f3'; ctx.fillRect(0, 0, 800, 400);
ctx.fillStyle = '#234'; ctx.font = '48px Georgia';
ctx.fillText('Содержимое под стеклом', 30, 180);
renderer.setBackdrop(source);

const binding = bindElement(renderer, element, {
  id: 'save', radius: 28, material: { variant: 'clear', appearance: 'light' },
});
const drag = bindDrag(renderer, element, { surface: binding.surface });

// При закрытии интерфейса:
function dispose() {
  drag.dispose(); binding.dispose(); stopResize(); renderer.dispose();
}
```

## Что можно делать

| Возможность | Где читать |
|---|---|
| Все параметры, методы, типы и ограничения | [Справочник API](api.md) |
| Свой GLSL, все пружинные каналы, импульсы и функция деформации | [Программирование](programmability.md) |
| Snell, Fresnel, две границы, TIR и CPU/GPU | [Расчёт лучей](ray-optics.md) |
| Подтверждённые принципы и реальные расхождения с Apple | [Аудит](apple-audit.md) |
| Цвет текста и иконок строго под линзой, с преломлением | [Текст под стеклом](text-under-glass.md) |
| Постоянная программа, pause/resume/cancel, пружины, Reduced Motion | [Программируемые анимации](animations.md) |
| Собственная карта отражений, поворот и обновление видео | [Свет и отражения](reflections.md) |
| DOM, React, изображения, видео, Windows и Android | [Интеграция](integration.md) |
| Слои стекла, SVG-контуры, отверстия, слияние, маски | [Устройство материала](architecture.md) |
| GPU-бюджет, DPR и стоимость наложения | [Производительность](performance.md) |
| Бугор, полосы, захват, неработающий цвет текста | [Устранение проблем](troubleshooting.md) |

## Рабочие примеры

- [Стенд материала и физики](../examples/workbench/): GLSL editor, две оптические модели, mass/stiffness/damping, импульс и пользовательская деформация.

- [Программируемая линза](../examples/programmatic/): постоянное движение, отдельная карта отражений, маска текста, ручное перетаскивание, остановка программы.
- [Лаборатория](../#motion-studio): меню, навигация, свободные контуры, стекло над стеклом и параметры материала.
- [Живой DOM](../examples/dom/): источник из HTML-in-Canvas с проверкой доступности API.

В исходниках примеры находятся в `examples/programmatic`, `examples/dom`, `examples/windows` и `examples/android`. `npm run dev` открывает и примеры, и документацию по адресу `/docs/`. `npm run build:demo` создаёт автономный сайт в `dist-demo`.

## Координаты и владение

Все размеры материала и геометрии задаются в CSS-пикселях относительно canvas renderer. Сам renderer масштабирует GPU-буферы с учётом DPR. `setBackdrop` растягивает изображение на viewport; `bindMediaBackdrop` предварительно делает cover/contain.

Renderer владеет WebGL-ресурсами, но не вашими canvas, DOM, Object URL и медиаплеерами. Сначала освобождаются привязки и программы, затем renderer. Рендер работает по необходимости; только активная постоянная программа или движущиеся пружины поддерживают цикл кадров.

## Границы реализации

Преломляется то, что передано в композицию renderer. Произвольные нативные окна и сторонние страницы автоматически не захватываются. Карта окружения — 2D-изображение, не 3D ray tracing. SVG-контуры используют поле 256×256. Установленный через `setVibrancySource` слой один на renderer. Пиксельное совпадение с iOS и одинаковое энергопотребление на разных устройствах не установлены.
