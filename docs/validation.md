# Проверки сборки

## v0.5.1

- TypeScript, сборка ESM/declarations и 12 unit-тестов — успешно.
- 35 браузерных проверок на Edge / D3D11 — успешно. Новая проверка подтверждает независимость оптического преломления и фаски: плоская середина на однотонном фоне, искажение полос при `bevel:0`, отдельное включение выпуклости.
- Старт и возобновление программы в живом примере используют пружинное назначение позиции, чтобы после ручного перемещения не было скачка к синусоидальной траектории.

## v0.5.0

23 ноября 2026 года, Windows, Edge / ANGLE D3D11 на Intel UHD Graphics (0x9B41).

- TypeScript, ESM, CSS, declarations и отдельный NodeNext consumer — успешно.
- 12 unit-тестов и 34 браузерные проверки — успешно. Проверены реальные shader/pixel paths, захват и перетаскивание, композиция слоёв, свободные контуры, текст под линзой, полосы/сетка, контекст GPU, остановка в покое, Reduced Motion, программируемые анимации и независимые отражения.
- Документация: переходы между страницами и живым примером, таблицы API, поиск и отсутствие горизонтального переполнения на ширине 360 px.
- Пример `examples/programmatic/main.ts` включён в проверку TypeScript.

Показатели и ограничения измерений — в [performance.md](performance.md). GitHub workflow повторяет сборку и тесты на Chromium; наличие workflow само по себе не означает успешный запуск CI.

## Историческая проверка v0.2.0

Локальная проверка 22–23 ноября 2026 года на Windows, Intel UHD Graphics (0x9B41), Edge 157 и ANGLE/D3D11.

- `npm run build:hosts`: TypeScript, ESM, CSS, declarations и копирование актуальных ресурсов в примеры Windows/Android — успешно.
- `npm test`: 12 тестов — успешно.
- `npm run test:browser` с `CHROMIUM_PATH` на Edge и `LIQUID_GLASS_GPU=1`: все 14 тестов — успешно. В том числе настоящее pointer drag, клавиатура, пиксели GPU, прерывание перехода, context loss/restore, Reduced Motion, живой HTML-in-Canvas и отсутствие повторных upload в покое.
- `npm run build:demo` и `tools/record-motion.mjs` на production preview: все девять сцен дошли до завершения без runtime-ошибок. Проверка production выявила исключение CSS контролов при tree shaking; явный импорт стилей исправляет его. Запись: `artifacts/motion-showcase.webm`, длительность около 35 секунд.
- Отдельная компиляция `tools/type-consumer.ts` с NodeNext проверяет declarations без Vite/Bundler module resolution.

Для воспроизведения аппаратных тестов в PowerShell:

```powershell
$env:CHROMIUM_PATH='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$env:LIQUID_GLASS_GPU='1'
npm run test:browser
```

Тесты работают одним worker. При недостатке памяти можно задать `NODE_OPTIONS='--max-old-space-size=192 --max-semi-space-size=2'` и запускать сборку, браузерные тесты и запись последовательно. Показатели производительности и контрольный пустой requestAnimationFrame находятся в [performance.md](performance.md).

Это проверка независимой web-реализации. Нативные Windows/Android хосты не компилировались из-за отсутствия SDK; работа на Android, 120 Hz, расход энергии и покадровое совпадение с iOS не подтверждены. Приватные видео и извлечённые кадры не входят в пакет.
