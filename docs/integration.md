# Интеграция в приложение

## Структура сцены

Один renderer на оптически общую область. Поместите WebGL canvas и семантические DOM hit targets в общий position-relative контейнер. Canvas занимает весь viewport; текстуры фона, foreground-маски и координаты поверхностей описывают эту же область. Не применяйте CSS transform к самому canvas renderer.

Renderer не обнаруживает фон страницы автоматически. Источником служит canvas, загруженное изображение/видео, поддерживаемый drawable DOM или bitmap, подготовленный нативным хостом. `content` отдельной поверхности задаётся в её локальных координатах; shader растягивает его на visualRect и отсекает контуром.

## Изображение и видео

```ts
import {bindMediaBackdrop} from '@liquid-glass/material';
const image = new Image();
image.src = '/images/background.jpg';
await image.decode();
const media = bindMediaBackdrop(renderer, image, {fit: 'cover'});
// resize renderer отслеживается binding автоматически
media.dispose();
```

Для удалённого изображения задайте crossOrigin до src и разрешите CORS на сервере. Для локального файла используйте Object URL, затем обязательно revokeObjectURL при смене/закрытии. Видео запускает приложение из допустимого пользовательского действия; binding получает только декодированные кадры. Dispose binding не вызывает pause и не удаляет URL вашего плеера.

Если crop уже выполнен в другом canvas, достаточно `setBackdrop(canvas)` и `updateBackdrop()` после изменения пикселей. SetBackdrop самостоятельно не делает cover — он растягивает вход на viewport.

## React

React не является зависимостью библиотеки. Создавайте renderer и bindings в effect после появления DOM, освобождайте в cleanup. Не создавайте renderer при каждом render компонента.

```tsx
function GlassAction({source}: {source: HTMLCanvasElement}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const r = new GlassRenderer(canvasRef.current!);
    const stop = observeSize(r);
    r.setBackdrop(source);
    const b = bindElement(r, buttonRef.current!, {id: 'save', radius: 26});
    return () => { b.dispose(); stop(); r.dispose(); };
  }, [source]);
  return <div className="stage">
    <canvas ref={canvasRef} aria-hidden="true" />
    <button ref={buttonRef}>Сохранить</button>
  </div>;
}
```

Здесь нужны обычные imports hooks из React и imports renderer/bindings из пакета; CSS stage соответствует быстрому старту. StrictMode может создать/освободить effect дважды, поэтому cleanup обязателен. При изменении содержимого того же source вызовите updateBackdrop через сохранённый ref renderer. При SSR выполняйте DOM-зависимый код только на клиенте. `supportsDomBackdrop` безопасен до появления document и вернёт false.

## Живой HTML

```html
<canvas id="source" content="drawable">
  <article drawable id="content">Ваш интерфейс</article>
</canvas>
<canvas id="glass"></canvas>
```

```ts
if (supportsDomBackdrop()) {
  const binding = bindDomBackdrop(renderer, sourceCanvas, content, {
    background: '#eef3f9', maxPixelRatio: 1.5,
  });
  // binding.refresh() после внешнего изменения, если нужен новый paint
}
```

Root content должен заполнять source canvas; source и WebGL canvas описывают один viewport. Drawable источник и WebGL-результат — разные canvas: читать и писать одну texture attachment нельзя. HTML-in-Canvas проверяется по фактическому API, а не по user-agent; на неподдерживаемом браузере предоставьте Canvas2D/bitmap-источник. Пример [живого DOM](../examples/dom/) показывает сохранение настоящей интерактивной кнопки.

Слой `foreground:true` может быть отдельным drawable представлением активных символов, но не должен непрозрачно закрывать всё изображение. Для единого активного цвета маски проще использовать [Canvas2D-пример текста](text-under-glass.md).

## Windows

В `examples/windows` находится WPF-host с WebView2. `npm run build:hosts` подготавливает web-ресурсы. Для компиляции нужны соответствующий .NET SDK и WebView2 Runtime; конкретные команды и требования перечислены в README примера.

Renderer выполняется внутри WebView, не подменяет WinUI/DWM. Чтобы преломлять содержимое своего нативного view, хост должен передавать согласованное изображение сцены; захват произвольного чужого окна библиотека не делает. Системные accessibility-параметры, которые WebView не отражает в media queries, передаются через setAccessibility.

## Android

В `examples/android` — Java/WebView-host с WebViewAssetLoader для локальных ресурсов. Подготовьте assets через build:hosts, затем собирайте Android-проект установленным SDK/Gradle. Нужны аппаратное ускорение и WebGL 2 в используемом WebView.

Это интеграция через WebView, не native Compose/Skia-рендерер. Реальный Android GPU, FPS, нагрев и прокрутка требуют проверки на целевых устройствах. Low ограничивает DPR и отключает спектральные выборки; deep stack стекла всё равно дороже отдельных контролов.

## Desktop wrappers и мобильный web

Electron и другие Chromium-хосты используют тот же ESM API. Не выключайте аппаратное ускорение; проверяйте наличие WebGL 2 и отдавайте CSS fallback при отказе constructor. Корректный touch-action задают bindings жестов; не отключайте прокрутку всего приложения ради одного drag.

## Очистка ресурсов

```ts
animation.cancel();
drag.dispose();
menu.dispose();
media.dispose();
domBinding.dispose();
elementBinding.dispose();
stopResize();
renderer.dispose();
video.pause();
URL.revokeObjectURL(localUrl);
```

Освобождайте только созданные вами объекты. Источники и DOM могут принадлежать другому компоненту; renderer их не удаляет. После renderer.dispose методы управления уже недействительны. При обычной смене материала dispose и повторное создание renderer не нужны.
