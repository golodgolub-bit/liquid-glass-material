# Программирование материала и физики

В v0.6 открыты три уровня: параметры материала/пружин, чистая функция деформации и GPU-код. Все новые функции экспортируются из `@liquid-glass/material`. [Рабочий стенд](../examples/workbench/) использует тот же публичный API; отдельного скрытого материала для демонстрации нет.

## Все каналы физики

```ts
import {createPhysics, springFromPhysical} from '@liquid-glass/material';
const physics = createPhysics({
  geometry: springFromPhysical({mass: 1, stiffness: 480, damping: 39}),
  material: {frequency: 3.5, damping: 1},
  press: {frequency: 4.7, damping: .9},
  reveal: {frequency: 4.2, damping: .9},
  offset: {frequency: 4.6, damping: .95},
  impulse: {frequency: 3, damping: .95},
  tone: {frequency: 2.3, damping: 1},
  shape: {frequency: 4.5, damping: 1},
  pressScale: [.065, .025], attraction: [5, 4],
  velocityScale: 2800, maxStretch: .1, crossCoupling: .25,
  revealScale: .9, impulseStrength: 1,
});
const renderer = new GlassRenderer(canvas, {physics}); // defaults новых поверхностей
const lens = renderer.addSurface({id: 'lens', rect, physics: {pressScale: [0,0]}});
lens.configurePhysics({geometry: {frequency: 2.5}}); // частично, без обнуления скорости
console.log(lens.physics, lens.state.velocity);
lens.kick({x: 650, y: -180}); // добавить CSS px/s к скорости геометрии
renderer.configureLightMotion({frequency: 2.5, damping: 1});
```

`springFromPhysical` переводит массу m, жёсткость k и коэффициент сопротивления c: frequency = √(k/m)/(2π), damping ratio = c/(2√(km)). Обратное преобразование — `springToPhysical({frequency,damping}, mass)`. Damping в физических параметрах и damping ratio — разные величины. Это стандартная затухающая пружина; совпадение с конкретным системным preset Apple не подразумевается.

Каждый канал принимает положительную конечную frequency и неотрицательный damping ratio. Пространственные параметры — CSS px, скорость — CSS px/s. pressScale — относительное увеличение по X/Y; attraction — максимальное смещение под указателем. maxStretch 0…0.5, crossCoupling 0…1, revealScale 0…1, impulseStrength неотрицательный. velocityScale положительный. Объекты и массивы копируются и замораживаются. Движущаяся поверхность после смены коэффициентов сохраняет состояние.

Колеблющиеся материальные пружины могут выходить за границы допустимой оптики. Перед рендером числовые свойства и tint ограничиваются диапазонами из экспортированного `materialRanges`; внутренние положение/скорость пружины сохраняются. Это не даёт отрицательной толщине попасть в sqrt или ior стать меньше единицы. Press-деформация ограничивает используемое значение pressed до 0…2. При damping=0 незатухающая пружина намеренно продолжает запрашивать кадры.

`bindDrag({surface,followSpring?,releaseSpring?})` разрешает свою пружину захвата и отпускания. Без releaseSpring восстанавливается геометрическая настройка, действовавшая до захвата. По умолчанию followSpring = 14 Hz / damping 1. `kick` при Reduced Motion не придаёт скорость.

## Собственная деформация

```ts
lens.deform(({visualRect, velocity, pressed}) => {
  const scale = 1 + Math.min(.12, Math.abs(velocity.x) / 4000) + pressed * .03;
  const width = visualRect.width * scale;
  return {...visualRect, x: visualRect.x + (visualRect.width - width)/2, width};
});
lens.deform(null); // восстановить стандартное поведение
```

Вход содержит rect, стандартный visualRect, velocity, pressed, visibility и offset. Это **чистая функция**: её вызывают отрисовка, hit testing и DOM-привязки, иногда несколько раз за кадр. Не меняйте renderer и внешнее состояние из функции, не читайте случайное время. Для времени используйте `addAnimation`, задающий состояние до шага пружин. Возвращайте конечный Rect с положительными размерами и неотрицательным radius. Произвольный поворот/mesh не представляется этим Rect; для визуальной геометрии используйте shape/field shader. При Reduced Motion пользовательская деформация обходится.

## Своя оптическая функция

```ts
import {createGlassShader} from '@liquid-glass/material';
const shader = createGlassShader({
  uniforms: {uGlass_gain: {type: 'float', value: 1}},
  optics: `
    GlassOpticalSample ray = defaultGlassOptics(data);
    ray.displacement *= uGlass_gain;
    return ray;
  `,
});
renderer.setShader(shader);
renderer.setShaderUniform('uGlass_gain', 1.4);
renderer.addAnimation(({time}) => renderer.setShaderUniform('uGlass_gain',1+Math.sin(time)*.1));
```

Код optics — тело `GlassOpticalSample glassOptics(GlassOpticalInput data)`. Доступны:

| Поле data | Смысл |
|---|---|
| depth | Неотрицательное расстояние внутрь границы, CSS px |
| width | Фактическая область оптики после ограничения размером формы |
| thickness / refraction / ior | Текущие параметры материала |
| gradient | Градиент signed distance field, X вправо / Y вниз |
| presence | Оптическая видимость 0…1 |

Результат: `normal` — 3D-нормаль с Y вверх и Z к наблюдателю; `displacement` — смещение выборки изображения в CSS px с Y вверх. Стандартная функция `defaultGlassOptics(data)` остаётся доступна. `sampleGlassOptics` — её CPU-reference для диагностики и сравнения с GPU. Полное определение функции открыто в исходниках и `shaderSources.glass`.

## Форма, цвет и helpers

`declarations` добавляет GLSL declarations/helpers. `field` — тело `vec4 glassField(vec2 point)`, где point в CSS px с Y вниз. Верните `(signedDistance, gradientX, gradientY, presence)`; стандартная функция — `defaultGlassField(point)`. Пользовательское поле ограничено CPU scissor-областью поверхностей: обеспечьте достаточный rect. CPU hit testing не исполняет GLSL; для точного попадания используйте согласованную SVG shape/Rect-деформацию или свой обработчик ввода.

`shade` — тело `vec3 glassShade(vec3 color, vec2 point, vec2 sampleUV, vec3 normal, float depth)`. Это последний цвет внутри покрытия, до clamp/premultiplied alpha. Можно программировать поглощение, тон и свой свет. `point` Y вниз; `sampleUV` и normal Y вверх. Пример: `return color * exp(-uGlass_absorption * depth);`, где uGlass_absorption — vec3.

Uniforms: float, vec2, vec3, vec4; имена начинаются с `uGlass_`, значения конечные, размер соответствует типу. Они общие для renderer; отдельный материал на группу задаётся обычным material API. Для других GLSL-типов можно собирать значения из векторов внутри shader. Дополнительных произвольных sampler-слотов этот API не выделяет; фон, scattering, vibrant mask, карта окружения и локальное содержимое доступны по стандартному ABI.

## Полная замена проходов

```ts
import {shaderSources} from '@liquid-glass/material';
renderer.setShader(createGlassShader({
  fragment: myGlassFragment,
  blurFragment: myScatteringFragment,
  backdropFragment: myBackdropFragment,
  uniforms: {uGlass_gain: {type:'float', value:1}},
}));
renderer.setShader(null); // стандартные проходы
```

Начните с `shaderSources.glass / blur / copy`; vertex неизменяемый и выводит fullscreen triangle + uv. Full fragment нельзя смешивать с optics/field/shade/declarations в одном descriptor. Дополнительные проходы — полные строки GLSL ES 3.00 с собственной декларацией uniforms. Общий prefix и типы проверяются. Основной shader сохраняет contentOnly для содержимого поверхностей, premultiplied alpha, scissor и uniform ABI, если вы хотите сохранить стандартную композицию. В основных исходниках есть все определения и привязки текстур.

Компиляция/линковка всех трёх программ выполняется **до** замены. При ошибке старые программы и uniforms остаются рабочими, новые освобождаются. Не компилируйте GLSL каждый кадр: меняйте uniforms. Изменение uniform при пользовательском blur-pass инвалидирует общий кэш рассеивания; стандартный blur повторно не выполняется для обычного shader-uniform. При замене программы blur инвалидируется один раз. Контекст GPU восстанавливает текущий код и последние uniforms. Менять код во время потерянного контекста нельзя; дождитесь restore. Uniforms можно обновлять до restore.

getShader() возвращает immutable descriptor с исходными defaults uniforms, getShaderUniform(name) — последнее значение. Прямое изменение объекта ничего не меняет. getShaderUniform неизвестного имени возвращает undefined; setter неизвестного имени выбрасывает ошибку.

## Луч через две границы

CPU API: `refractRay`, `fresnelReflectance`, `traceSlabRay`. [Оптика и лучи](ray-optics.md) описывает координаты, поглощение и ограничения. `slabOpticsGLSL` позволяет выполнить тот же базовый путь прямо в optics/shade hook. Это отдельная физическая модель, а не найденный алгоритм Apple.
