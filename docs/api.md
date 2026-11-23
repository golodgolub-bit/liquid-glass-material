# Справочник API

Все импорты — из `@liquid-glass/material`; CSS подключается отдельно через `@liquid-glass/material/style.css`. Пространственные единицы — CSS px, время — секунды, углы — радианы, RGB — числа 0…1. Ошибки входных значений выбрасываются синхронно, ошибки отрисовки поступают в `onError`.

## GlassRenderer

```ts
const renderer = new GlassRenderer(canvas: HTMLCanvasElement, options?: RendererOptions);
```

Нужен WebGL 2. Уже полученный у canvas контекст другого типа использовать нельзя. Constructor создаёт GPU-ресурсы; скрытую страницу renderer автоматически приостанавливает. На `webglcontextlost` сохраняет CPU-состояние, после restore заново загружает источники и поля форм.

| RendererOptions | По умолчанию | Значение |
|---|---|---|
| `quality` | `'balanced'` | `'low' / 'balanced' / 'high'` |
| `maxPixelRatio` | Предел профиля | Положительное число; учитывается вместе с DPR и лимитом GPU |
| `drawBackdrop` | `true` | `false` оставляет внешний фон прозрачным, сохраняя композицию стеклянных слоёв |
| `measureGpu` | `false` | Асинхронный GPU timer при наличии расширения |
| `accessibility` | Системные media queries | Частичный `Accessibility` |
| `onError` | `console.error` | `(error: Error) => void` |
| `physics` | `defaultPhysics` | Частичные defaults физики для новых поверхностей |
| `shader` | Стандартный | `GlassShader`, созданный createGlassShader |

| Метод | Результат / действие |
|---|---|
| `resize(width, height)` | Положительные конечные размеры viewport; перевыделяет GPU targets |
| `setQuality(quality)` | Меняет DPR/разрешение рассеивания и перевыделяет targets |
| `setBackdrop(source)` | Сохраняет ссылку, загружает пиксели на следующем кадре |
| `updateBackdrop()` | Отмечает изменённый исходник для повторной загрузки |
| `bindVideo(video)` | Возвращает `stop()`; обновляет фон по `requestVideoFrameCallback` |
| `setVibrancySource(sourceOrNull, {color?}?)` | Полноразмерный прозрачный слой символов либо маска с единым RGB-цветом |
| `setReflectionSource(sourceOrNull)` | Отдельная equirectangular-карта окружения; null возвращает отражение фона |
| `updateReflection()` | Перезагружает изменённый canvas/video окружения |
| `setReflectionRotation(radians)` | Поворачивает карту по долготе без upload |
| `setLight(x, y, animate = true)` | Ненулевое конечное направление в плоскости canvas; внутри нормализуется |
| `configureLightMotion(springOptions)` | Пружина направления света |
| `setShader(shaderOrNull)` | Транзакционная компиляция glass, blur и backdrop; null возвращает стандартные проходы |
| `getShader()` | Immutable descriptor активной программы, defaults uniforms |
| `setShaderUniform(name,value)` | Меняет общий float/vec2/vec3/vec4 без компиляции; custom blur инвалидирует его кэш |
| `getShaderUniform(name)` | Последнее значение либо undefined |
| `addSurface(options)` | Новый `SurfaceHandle`, id должен быть уникальным |
| `addAnimation(callback, options?)` | Управляемая программа `GlassAnimation`, до интеграции пружин и draw |
| `setAccessibility(partial)` | Переопределяет только переданные настройки; `undefined` возвращает системную настройку |
| `setScrollEdges(partial)` | Задаёт области scroll-edge; остальные стороны сохраняются |
| `subscribe(listener)` | Возвращает `unsubscribe()`; callback со snapshot stats после draw, не самостоятельный цикл анимации |
| `invalidate()` | Запрашивает один кадр; повторные вызовы объединяются |
| `releaseInteractions()` | Отпускает все удерживаемые поверхности |
| `dispose()` | Идемпотентно останавливает программы и освобождает GPU/системные подписки |

Свойства `canvas`, `size: {width,height}`, `stats`, `accessibility`, `scrollEdges` доступны для чтения. Snapshot-объекты не изменяют внутреннее состояние при редактировании.

`BackdropSource = HTMLCanvasElement | OffscreenCanvas | HTMLImageElement | HTMLVideoElement`. Изображение должно быть загружено, видео — декодировать кадр; удалённому источнику нужен допустимый CORS. `ImageBitmap`, `ImageData`, `VideoFrame` предварительно рисуются в 2D canvas. Предельный размер проверяется по `MAX_TEXTURE_SIZE` GPU. Исходник не захватывает DOM или другие поверхности автоматически.

## SurfaceOptions

```ts
type Rect = { x: number; y: number; width: number; height: number; radius: number };
```

Ширина/высота положительные, radius неотрицательный, все значения конечные. При draw radius ограничен половиной размеров.

| Поле | По умолчанию | Смысл |
|---|---|---|
| `id` | Обязательно | Непустой уникальный идентификатор |
| `rect` | Обязательно | Положение и размеры |
| `material` | `materials.regular` | Частичные оптические параметры |
| `group` | `id` | Совпадение объединяет SDF; максимум 32 поверхности на группу |
| `spacing` | `0` или от группы | 0…100, ширина smooth union в CSS px |
| `layer` | `0` или от группы | Конечное число, порядок от заднего к переднему |
| `interactive` | `true` | Разрешает оптическую реакцию `interact` |
| `elastic` | `true` | Растяжение от скорости движения; `false` для жёсткой панели |
| `materialize` | `false` | Первое появление через оптическую видимость |
| `hidden` | `false` | Начальная видимость 0 |
| `vibrancy` | `false` или от группы | Включает чтение общей маски текста/символов |
| `shape` | Округлённый rect | `GlassShape`, созданный `createGlassShape` |
| `content` | Нет | Локальный RGBA-источник, который рисуется поверх материала и виден передним слоям |
| `physics` | Defaults renderer | Частичный PhysicsOptions, все восемь каналов и деформация |
| `deform` | Стандартная | Чистая DeformationFunction |

Члены группы обязаны иметь одинаковые материал, spacing, layer и vibrancy. Изменение материала одного члена меняет всю группу. Разные группы не сливаются геометрически; передняя преломляет уже отрисованную заднюю. При равных layer сохраняется порядок добавления групп.

## SurfaceHandle

| Метод | Результат / действие |
|---|---|
| `move(partialRect, animate = true)` | `this`; задаёт цели геометрии; false синхронно устанавливает значения |
| `motion(springOptions)` | `this`; меняет параметры геометрических пружин без смены цели |
| `configurePhysics(partial)` | `this`; меняет каналы и параметры, сохраняя состояние |
| `deform(functionOrNull)` | `this`; чистая функция возвращает визуальный Rect; null восстанавливает стандартную |
| `kick(partialVelocity)` | `this`; добавляет скорость CSS px/s к геометрии, игнорируется при Reduced Motion |
| `animateTo(partialRect, motionOptions?)` | `Promise<MotionResult>` |
| `material(partialMaterial, animate = true)` | `this`; плавно меняет параметры всей группы |
| `shape(shapeOrNull, motionOptions?)` | `Promise<MotionResult>`; null возвращает rounded rect |
| `content(sourceOrNull)` | `this`; обновляет локальную текстуру; вызвать также после изменения её пикселей |
| `contains(x,y)` | `boolean`; проверяет текущий визуальный контур, отверстия и смешанную форму |
| `interact(pressed, x?, y?)` | `this`; включает/отпускает деформацию и подсветку касания |
| `show(options?) / hide(options?)` | `Promise<MotionResult>`; видимость отдельного члена группы |
| `settled()` | Ждёт покоя всех пружин данной поверхности |
| `dismiss(options?)` | Скрывает и удаляет при успешном завершении |
| `remove()` | Удаляет материал и локальную текстуру; привязки освобождаются отдельно |

`rect` — текущее базовое положение, `foreground` — RGB-строка контрастного текста, `state` — snapshot:

```ts
interface SurfaceState {
  rect: Rect; visualRect: Rect; velocity: Rect; visibility: number; pressed: number;
  energy: number; moving: boolean; material: Readonly<GlassMaterial>;
}
```

`visualRect` учитывает проявление, упругость и касание; hit targets должны следовать ему. `bindElement` делает это автоматически. Исходный `rect` не является конечной целью анимации. Методы удалённой поверхности выбрасывают ошибку. Прерывание move/material/shape/show/hide разрешает прежние ожидания с `{finished:false}`; это не исключение. `settled()` не ожидает окончания независимой бесконечной программы renderer.

`physics` — immutable конфигурация поверхности. Полные типы и defaults: [Программирование](programmability.md). Там же описаны GlassShaderOptions, GLSL hooks, стандартный uniform ABI, полная замена fragment/blur/backdrop и восстановление программ. Параметры геометрии отображаются в velocity; остальные числовые каналы не являются полями Rect.

## Открытые оптические и физические функции

| Экспорт | Назначение |
|---|---|
| `createPhysics(options?,base?) / defaultPhysics` | Проверка, копирование и defaults восьми каналов |
| `springFromPhysical({mass,stiffness,damping})` | Частота и damping ratio физической пружины |
| `springToPhysical({frequency,damping},mass=1)` | Обратное преобразование |
| `createGlassShader(options?) / shaderSources` | Сборка immutable shader descriptor и открытый GLSL исходник проходов |
| `sampleGlassOptics(probe)` | CPU-reference стандартной экранной оптики |
| `refractRay(incident,normal,eta)` | Нормализованный луч либо null при TIR |
| `fresnelReflectance(cosIncident,n1,n2)` | Точный неполяризованный Fresnel на границе |
| `traceSlabRay(options) / slabOpticsGLSL` | CPU/GPU путь через две границы; см. [расчёт лучей](ray-optics.md) |

Типы: GlassPhysics, PhysicsOptions, PhysicsChannel, DeformationState, DeformationFunction, PhysicalSpring, GlassShader, GlassShaderOptions, ShaderUniform, ShaderValue, Vec2, Vec3, SlabRay, SlabRayOptions, OpticalProbe. Длины/координаты и границы применения приведены в отдельных руководствах; slab tracer не объявлен закрытой реализацией Apple.

## GlassMaterial

Создаётся `createMaterial(partial?)`, возвращает новый immutable объект. Presets `materials.regular`, `materials.clear`, `materials.identity` также immutable. Частичное обновление `surface.material` сохраняет остальные настройки; смена `variant` сначала берёт preset нового варианта.

| Параметр | Regular | Диапазон / смысл |
|---|---|---|
| `variant` | `'regular'` | `'regular' / 'clear' / 'identity'`; identity исключает поверхность из композиции |
| `appearance` | `'auto'` | `'auto' / 'light' / 'dark'`; light — тёмный foreground, dark — светлый |
| `thickness` | `18` | 0…100 px, оптическая глубина; не ширина выпуклости |
| `edgeWidth` | `12` | 0…32 px, область оптического преломления; автоматически ограничена размером поверхности |
| `bevel` | `0` | 0…1, декоративная выпуклая фаска; по умолчанию выключена, независимо от преломления |
| `edgeContrast` | `.18` | 0…1, узкий затемнённый контур, независимый от фаски |
| `refraction` | `13` | 0…100 px, сила краевого преломления |
| `magnification` | `1` | 1…2, увеличение середины; 1 сохраняет масштаб |
| `dispersion` | `.35` | 0…5, спектральное разделение; в low отключено |
| `ior` | `1.48` | 1…2.5, показатель преломления и Fresnel |
| `reflection` | `.38` | 0…1, сила отражения с учётом Fresnel |
| `cornerPower` | `2.6` | 2…4, профиль continuous corners; круги/капсулы остаются круговыми |
| `frost` | `.68` | 0…1, рассеивание между sharp и двумя уровнями blur |
| `tint` | `[1,1,1]` | RGB, каждый компонент 0…1 |
| `tintOpacity` | `0` | 0…1, цветовое поглощение |
| `saturation` | `1.12` | 0…3 |
| `highlight` | `.5` | 0…2, направленные краевые блики |
| `shadow` | `.065` | 0…1, контактная тень |
| `dimming` | `0` | 0…1, локальное затемнение |

Clear отличается `variant:'clear', frost:.08, refraction:17, thickness:16, highlight:.6, appearance:'dark'`; остальное наследует Regular. Identity наследует Regular и выключает draw. Выпуклая рамка выключена через `bevel:0`, но оптическое преломление продолжает работать. `bevel:1` включает фаску для намеренного объёмного эффекта. `edgeWidth:0, magnification:1` отключает и краевое искажение, и увеличение середины. Чтобы выключить только искажение края, сохранив форму и настройки, используйте `refraction:0`.

## Движение и программы

```ts
interface SpringOptions { frequency?: number; damping?: number }
interface MotionOptions { immediate?: boolean; spring?: SpringOptions }
interface MotionResult { finished: boolean }
```

Frequency положительная, damping неотрицательный. `motionPresets`: responsive `{3.8,.88}`, fluid `{3.1,.88}`, gentle `{2.5,.96}` — пары frequency/damping. Геометрические цели можно переназначать без сброса скорости. Морфинг произвольных полей при прерывании сохраняет границу с точностью поля, но не скорость каждой точки.

```ts
const animation = renderer.addAnimation(({time, delta, frame, renderer}) => {
  surface.move({x: 100 + Math.sin(time) * 60}, false);
}, {essential: false, paused: false});
```

Callback вызывается до draw на едином scheduler. Возвращение `false` отменяет программу. `time` — активные секунды без пауз/скрытой вкладки/потерянного контекста; `delta` равен 0 на старте/возобновлении. `frame` начинается с 0. Callback может менять геометрию, материал, свет, отражение и источники. Для точной покадровой функции используйте `animate=false`, иначе создаются пружинные цели. Callback, выбросивший ошибку, отменяется и передаёт её в onError.

`GlassAnimation`: `pause()`, `resume()`, `cancel()`, readonly `running`, `elapsed`. Cancel окончательный, resume после него ничего не делает. Running обозначает намерение выполнять программу: Reduced Motion может дополнительно приостановить её. `essential:true` следует задавать только для действительно необходимого обновления; ручной override Reduced Motion передаётся через renderer. Dispose отменяет все программы.

`Spring(value, frequency=3.5, damping=.88)`: изменяемые value/target/velocity/frequency/damping, `step(seconds):boolean`, `snap(value?)`. Это низкоуровневая аналитическая пружина; renderer использует её автоматически. `roundedRectDistance(x,y,rect)` и `smoothUnion(a,b,k)` — вспомогательные функции геометрии.

## Формы

```ts
const shape = createGlassShape({
  path: 'M 50 5 L 95 95 L 5 95 Z',
  viewBox: [100, 100], fillRule: 'nonzero',
});
```

`path` — SVG path string, `viewBox` — положительные ширина/высота (по умолчанию 100×100), `fillRule` — nonzero/evenodd. Контур должен иметь видимую границу внутри viewBox. Поддерживаются Bézier-кривые и отверстия. Создание требует browser Canvas2D/Path2D, не выполняется в SSR. Дистанционное поле 256×256 строится один раз; масштабирование после создания не пересчитывает его. Большое увеличение выявляет разрешение поля. Для smooth union контуры задаются одному group.

## Привязки DOM и жестов

| Функция | Параметры / возвращаемое значение |
|---|---|
| `bindElement(renderer, element, options)` | options — SurfaceOptions без rect, плюс radius; обязательный id. Возвращает `{surface,refresh(animate=false),dispose}` |
| `observeSize(renderer)` | Следит за размером canvas; возвращает функцию остановки |
| `bindDrag(renderer, element, {surface,bounds?,onStart?,onEnd?,followSpring?,releaseSpring?})` | bounds — функция, возвращающая Rect; результат `{dragging,dispose}`. Проверяет реальный контур, поддерживает window routing при отказе pointer capture. Пружина отпускания по умолчанию восстанавливает настройку поверхности |
| `bindLiquidSelection(renderer, rail, {id,items,initialIndex=0,vibrancy=true,material?,onSelect?})` | `{surface,selectedIndex,select(index,animate=true),refresh,dispose}`; горизонтальный lift/drag/snap, клавиши Left/Right/Home/End |
| `bindLiquidHighlight(renderer, container, {id,items,layer=1,material?})` | `{surface,select(index),refresh,dispose}`; -1 скрывает; hover, focus, held drag для menu rows |

`bindElement` владеет CSS translate/scale/opacity/visibility элемента, обновляет их из visualRect и восстанавливает при dispose. Используйте отдельную обёртку, если приложение само анимирует эти свойства. Canvas renderer не должен иметь CSS transform; координаты указателя масштабируются через его bounding rect. Саму DOM-кнопку bindElement не делает перетаскиваемой — для этого добавьте bindDrag.

## Готовые контролы

`ControlOptions = Omit<SurfaceOptions,'id'|'rect'> & {id?:string;radius?:number}`. Контролы создают семантический DOM и GPU-поверхность; результат содержит element, surface, refresh, dispose.

| Функция | Дополнительные свойства результата |
|---|---|
| `glassButton(renderer,parent,label,options?)` | `element: HTMLButtonElement`; обычная кнопка, не свободный drag по умолчанию |
| `glassToggle(renderer,parent,label,checked=false,options?)` | `checked`, `setChecked(boolean)`; role switch, change event |
| `glassSlider(renderer,parent,label,value=50,options?)` | options min=0,max=100,step=1; `input`, `setValue(number)`; native range |
| `glassTabs(renderer,parent,labels,options?)` | options label для aria; `selectedIndex`, `select(index)`; travelling surface |
| `glassSearch(renderer,parent,options?)` | options placeholder='Search',width=340; `input`, `expanded`, `expand()/collapse():Promise<MotionResult>` |

## Меню и панели

```ts
glassPopover(renderer, anchor, items, options?)
glassSheet(renderer, anchor, contentElement, options?)
```

`MenuItem = {label,onSelect?,disabled?,separator?}`. Separator вставляется перед строкой. Панель имеет role menu/dialog и обновляет aria-haspopup/expanded/controls на anchor. Escape/outside dismiss; меню поддерживает клавиши перемещения, dialog — Tab trapping. Нажатие menuitem закрывает меню и вызывает onSelect.

`PanelOptions`: id, parent (по умолчанию canvas.parentElement), width (258), height, radius (28), material, destination:()=>Rect, liquidMorph (true у меню). Menu height по умолчанию `items.length*46+30`. Результат `PanelController`: element, surface, isOpen, `open/close/toggle():Promise<MotionResult>`, refresh, dispose. Sheet дополнительно `setDetent('medium'|'large')`; height medium ограничен 68% viewport. Геометрия и foreground следуют одной поверхности; графика перехода приблизительная, не приватная реализация UIKit.

## Источники и окружение

`bindMediaBackdrop(renderer, imageOrVideo, {fit?:'cover'|'contain'|'fill', maxPixelRatio?:number, background?, onError?}?)` возвращает `{canvas,refresh,dispose}`. Fit по умолчанию cover, maxPixelRatio=1.5, background — CSS-цвет (по умолчанию чёрный). Размер renderer отслеживается, decoded video frames обновляют подложку. URL, play/pause и Object URL остаются у приложения.

`supportsDomBackdrop():boolean` проверяет фактический HTML-in-Canvas API. `bindDomBackdrop(renderer, sourceCanvas, contentElement, {maxPixelRatio=1.5,background?,foreground=false,onError?}?)` требует отдельный source canvas, содержащий content. Результат `{canvas,paints,refresh,dispose}`. Foreground отправляет RGBA в vibrancy source; явный цвет после каждого paint задаётся приложением либо самим foreground. Неподдерживаемый браузер выбрасывает ошибку — нужен явный источник или CSS fallback.

`bindEnvironmentLight(renderer, element, {strength=.8}?)` реагирует на pointer; strength 0…2. Возвращает `{requestDeviceOrientation():Promise<boolean>,dispose}`. Запрашивайте датчик только из явного действия пользователя. Сам binding не создаёт карту окружения; направление света и отражаемое изображение — разные входы.

## Прокрутка и доступность

`bindScrollBehavior(renderer, scroller, {surface,expanded,collapsed,edge='bottom',edgeExtent=90,threshold=9,onScroll?})` возвращает `{refresh,dispose}`. Меняет размер/положение поверхности по направлению с hysteresis; приложение должно обновить изображение прокручиваемого контента в onScroll. При dispose восстанавливает прежние scroll edges.

`ScrollEdges = {top,right,bottom,left,hard,color}`: размеры неотрицательные, hard boolean, color RGB или null для адаптивного цвета. `Accessibility = {reducedMotion,reducedTransparency,increasedContrast}`. Системные media queries читаются в constructor и отслеживаются. Reduced Motion немедленно завершает пружины и приостанавливает неessential программы; Reduced Transparency усиливает непрозрачность; Increased Contrast меняет передачу цвета/границу.

## Метрики и ресурсы

`RenderStats`: frames, cpuMs, gpuMs (null без timer), drawCalls (drawArrays, не blit), uploads (фон), foregroundUploads, reflectionUploads, blurPasses (накопительные), surfaces, groups, pixelRatio, textureBytes (оценка, без скрытых копий драйвера). CPU submission не равно времени кадра. Постоянная программа намеренно поддерживает кадры; pause/cancel дают renderer уснуть после окончания оставшихся пружин.

## Низкоуровневые методы renderer по id

Обычно удобнее SurfaceHandle. Для интеграции с собственной моделью доступны эквивалентные методы renderer:

| Метод renderer | Эквивалент handle |
|---|---|
| `getRect(id) / getState(id) / getForeground(id)` | rect / state / foreground |
| `updateSurface(id, partialRect, animate=true)` | move |
| `configureMotion(id, springOptions)` | motion |
| `animateSurface(id, partialRect, options?)` | animateTo |
| `setMaterial(id, partialMaterial, animate=true)` | material |
| `setInteraction(id, pressed, x?, y?)` | interact |
| `setVisibility(id, visible, options?)` | show/hide |
| `whenSettled(id)` | settled |
| `setShape(id, shapeOrNull, options?)` | shape |
| `setContent(id, sourceOrNull)` | content |
| `contains(id, x, y)` | contains |
| `removeSurface(id)` | remove |

Не создавайте SurfaceHandle вручную: addSurface регистрирует всё необходимое состояние. Публичные TypeScript-типы экспортируются из корня: RendererOptions, SurfaceOptions, SurfaceState, ScrollEdges, Accessibility, RenderStats, BackdropSource, MotionOptions, MotionResult, SpringOptions, AnimationFrame, AnimationCallback, AnimationOptions, GlassMaterial, Quality, Appearance, RGB, Rect, GlassShape, ElementBinding, Control, ControlOptions, ToggleControl, SliderControl, TabsControl, PanelController, PanelOptions, SheetController, MenuItem, SearchControl, ScrollBehaviorOptions, DomBackdropBinding, LiquidSelection, LiquidSelectionOptions, LiquidHighlight, HighlightOptions, EnvironmentLight, DragOptions, MediaBackdropOptions, MediaBackdropBinding.
