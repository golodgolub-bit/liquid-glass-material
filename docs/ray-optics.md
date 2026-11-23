# Оптика и расчёт лучей

## Какая трассировка есть

Стандартный материал — экранная модель: signed distance field → нормаль → Snell refraction → смещение UV → фильтрация изображения. Один исходный RGBA-слой не содержит геометрии и глубины полной сцены. Он не позволяет восстановить скрытые объекты, реальную толщину стекла или дерево многократных отражений.

v0.6 дополнительно предоставляет аналитический **однопроходный путь через две плоские границы**. Это точный расчёт для описанной геометрии, но не общий path tracer и не подтверждённый код Apple.

## CPU: Snell и Fresnel

```ts
import {refractRay, fresnelReflectance, traceSlabRay} from '@liquid-glass/material';
const refracted = refractRay([.5,0,-Math.sqrt(.75)], [0,0,1], 1/1.48);
// eta = n исходной среды / n следующей среды. При TIR: null.
const reflected = fresnelReflectance(1, 1, 1.48);
const path = traceSlabRay({
  incident: [.5,0,-Math.sqrt(.75)],
  entryNormal: [0,0,1], exitNormal: [0,0,1],
  ior: 1.48, outsideIor: 1,
  thickness: 10, backdropDistance: 4,
  absorption: [.01,.02,0],
});
```

Векторы нормализуются; нормаль каждой границы направлена **против падающего на неё луча**, как ожидает GLSL refract. Поэтому для параллельной пластины обе передаваемые нормали `[0,0,1]`, хотя внешние геометрические нормали её граней противоположны. Точка входа — начало координат. Выходная плоскость проходит через `(0,0,-thickness)` и ориентируется exitNormal; пересечение находится аналитически. Фон — горизонтальная плоскость `z=-(thickness+backdropDistance)`; incident.z должен быть отрицательным. Можно описать локальный клин с наклонённой выходной плоскостью, но не произвольный mesh.

Результат содержит internal, outgoing, offset, pathLength, entryReflectance, exitReflectance, transmittance и totalInternalReflection. Offset — разница между следом преломлённого и непреломлённого лучей на фоне, X вправо / Y вверх. Если фон недостижим или есть TIR, offset=null. Если выходной луч существует, но смотрит от фоновой плоскости, outgoing может быть ненулевым при offset=null; это не TIR.

Fresnel — среднее s/p-поляризаций. Поглощение — `(1-Fentry)*(1-Fexit)*exp(-absorption*pathLength)`. Внутренние повторные отражения и интерференция не суммируются. При TIR transmittance равен нулю. Коэффициент absorption имеет обратные единицы к thickness; все длины должны иметь согласованные единицы. Ior/outsideIor положительны, длины и absorption неотрицательны.

## GPU: тот же путь в материале

```ts
import {createGlassShader, slabOpticsGLSL} from '@liquid-glass/material';
renderer.setShader(createGlassShader({
  declarations: slabOpticsGLSL,
  uniforms: {uGlass_gap: {type:'float', value:4}},
  optics: `
    GlassOpticalSample ray = defaultGlassOptics(data);
    float t = clamp(data.depth / max(data.width,.001), 0.0, 1.0);
    float h = 1.0 - pow(1.0-t, 3.0);
    SlabRay path = traceSlab(vec3(0,0,-1), ray.normal, vec3(0,0,1),
        data.ior, 1.0, data.thickness*h, uGlass_gap);
    ray.displacement = path.offset * data.presence;
    return ray;
  `,
}));
```

GLSL SlabRay возвращает internalRay, outgoingRay, offset, pathLength, transmission, tir и valid. Transmission скалярный, без absorption; цветное поглощение можно вычислить `exp(-sigma*pathLength)` в своём shade. tir=1 означает полное внутреннее отражение; valid=1 означает наличие прямого следа на фоне. При недостижимом фоне offset=0, valid=0; передача через границу может оставаться ненулевой, если луч ушёл в другую сторону. Нулевое displacement само по себе не превращает поверхность в физическое зеркало: для этого запрограммируйте shade и выборку карты окружения. Стенд демонстрирует геометрический путь, а не полную энергетическую модель.

## Проверка

Численно проверяются закон Снеллиуса, критический угол, Fresnel при нормальном падении, сохранение направления после параллельной пластины, сдвиг следа и поглощение. Браузерный тест кодирует нормаль/смещение/передачу в пиксели и сравнивает с CPU с допуском один уровень RGBA8. В CPU расчёт выполняется в double, GLSL — highp float; это не обещание побитового равенства на всех GPU.

Определение GLSL refract доступно в [Khronos Reference](https://registry.khronos.org/OpenGL-Refpages/gl4/html/refract.xhtml). Выбор метода лучей не доказывает совпадение с [цифровым материалом Apple](https://developer.apple.com/videos/play/wwdc2025/219/). См. [аудит](apple-audit.md).
