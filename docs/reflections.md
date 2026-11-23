# Свет и отражения

В материале различаются передаваемое изображение, рассеивание, направленный блик и отражаемое окружение. Изменение источника отражения не меняет фон, который виден через стекло.

## Отражение фона

Без отдельной карты материал приближённо отражает текущий размытый фон. При наложении это включает задние стеклянные слои. Сила задаётся `material.reflection` и Fresnel-фактором из ior и нормали. `highlight` управляет отдельным краевым светом; `setLight` меняет его направление.

```ts
lens.material({reflection: .45, highlight: .35, ior: 1.48});
renderer.setLight(-.65, -.76); // мягко изменить направление
renderer.setLight(-.3, -.9, false); // немедленно
```

На плоской середине отражение слабее, у края сильнее. Значение reflection=1 не означает непрозрачное зеркало: Fresnel всё равно учитывается. Ior=1 убирает преломление и Fresnel-отражение; это полезный контрольный режим.

## Своя карта окружения

```ts
const environment = new Image();
environment.crossOrigin = 'anonymous'; // до src, если источник удалённый
environment.src = '/assets/studio-panorama.jpg';
await environment.decode();
renderer.setReflectionSource(environment);
renderer.setReflectionRotation(Math.PI / 3);
```

Источник — equirectangular panorama: горизонталь — долгота 0…360°, вертикаль — север сверху и юг снизу. Для полного окружения удобно соотношение 2:1; технически допускается любой положительный размер, включая 1×1 для постоянного цвета. Горизонтальные края панорамы желательно согласовать, чтобы шов не был виден при вращении.

Отражённый луч получается из нормали материала, затем отображается на эту 2D-карту. Это экранная модель, а не 3D ray tracing, cubemap или физический HDR light transport. Метаданные HDR здесь не обрабатываются: WebGL targets и примеры используют RGBA8/sRGB.

## Вращение без повторной загрузки

```ts
const rotation = renderer.addAnimation(({time}) => {
  renderer.setReflectionRotation(time * .2);
});
```

Поворот меняет один uniform. `stats.reflectionUploads` остаётся прежним. Программа поддерживает кадры намеренно; pause/cancel останавливают её. Установка карты общая для renderer, а сила отражения независима в материале каждой группы.

## Canvas и видео

После изменения пикселей уже установленного canvas вызовите `renderer.updateReflection()`. Повторный setReflectionSource также отмечает источник для загрузки.

```ts
renderer.setReflectionSource(video);
let stopped = false;
let token = 0;
function decoded() {
  if (stopped) return;
  renderer.updateReflection();
  token = video.requestVideoFrameCallback(decoded);
}
token = video.requestVideoFrameCallback(decoded);
function stop() {
  stopped = true;
  video.cancelVideoFrameCallback(token);
}
```

Приложение загружает/запускает видео и управляет его URL. Если requestVideoFrameCallback недоступен, обновляйте на событиях/кадрах собственного медиахоста. Не запускайте video-play автоматически в обход политики браузера. Нужен CORS-допустимый, декодируемый источник.

## Отключение и восстановление

`renderer.setReflectionSource(null)` возвращает выборку отражения из фона. `lens.material({reflection:0})` выключает отражение конкретной группы. Направленный блик выключается отдельно через highlight=0.

После потери GPU-контекста renderer восстанавливает текстуру из сохранённого источника. Если вы удалили исходный video/canvas, заранее отсоедините его. Сама библиотека не владеет внешними медиаресурсами.

В [живом примере](../examples/programmatic/) можно отключить карту, менять силу отражения и включать её вращение вместе с постоянной программой.
