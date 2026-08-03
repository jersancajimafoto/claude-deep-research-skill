# ESTILO — Jers | IA + Automatización

> Sistema visual oficial de la marca personal **Jers Ancajima** para contenido de IA
> (Instagram, tienda, Bóveda). Versión 1, 2026-08-03. Derivado del Design DNA de
> @ai._kid/claura-ai (`design-dna.md`), adaptado a marca propia. Referencia viva:
> `paleta-preview.html`. Estrategia que sirve: `ESTRATEGIA-IG.md`.

## Regla 0 — Variación obligatoria (LA regla)

**Cada carrusel se diseña distinto. Nunca el mismo molde dos veces.** Lo que se mantiene
fijo es la FIRMA (paleta, tipografía, personaje, footer, la regla de un-acento). Lo que ROTA
en cada pieza es la COMPOSICIÓN: se elige un arquetipo distinto (ver §5), se cambia el layout,
la posición del personaje, el tipo de "prueba". Las 83 referencias son el banco de variación,
no una plantilla a copiar. Si dos carruseles seguidos se ven iguales, está mal.

## 1. Paleta (SIN teal en carruseles)

| Token | Hex | Uso |
|---|---|---|
| Crema | `#EFEAE0` | fondo base, ~90% del lienzo |
| Terracota | `#C97B58` | **el** acento — UNA palabra itálica por titular, pills CTA, bullets, stats |
| Terracota profundo | `#B8654A` | variante de botón / hover |
| Negro cálido | `#1C1712` | titulares y texto |
| Mockup oscuro | `#121212` | tarjetas "prueba" embebidas |
| Blush | `#E7D6CB` | badges de kicker |
| Verde éxito | `#3C8C52` | SOLO dentro de mockups (checks, %) |

**Teal `#1E8A7B`: eliminado de los carruseles.** El personaje propio ya diferencia de
@ai._kid. El teal puede sobrevivir solo como detalle en la web/tienda, nunca en el contenido IG.

**Regla de oro:** terracota se usa **una sola vez por slide**, sobre la palabra que más
importa del titular. Nunca disperso. Esa disciplina = se ve premium.

## 2. Tipografía

| Rol | Fuente | Uso |
|---|---|---|
| Serif display | **Fraunces** (+ Fraunces Italic) | titular; la itálica = la palabra-acento terracota |
| Sans grotesk | **Inter** | cuerpo, texto de mockups |
| Monoespaciada | **JetBrains Mono** | kickers, tags, contenido de terminal |

Escala (lienzo 1080w): titular ~64-76px · subtítulo itálico ~28-34px · body ~22-26px ·
kicker mono ~13-15px mayúsc. trackeadas · stat itálico ~34-42px. Las tres son Google Fonts
gratis. Fraunces+Inter ya las usa la tienda → unifica IG + tienda + Bóveda.

## 3. Personaje de marca

- **Base aprobada:** `mascota/jers-pixel-v3.png` (transparente, cuadrado 1367×1367) — pixel-art
  sticker de Jers real: fade + barba definida, polo piqué negro, sonrisa sutil, contorno blanco.
- **Uso:** motivo de firma recurrente, como las mascotas de @ai._kid pero es él → 100% ownable.
- **Poses adicionales:** se generan **on-demand** cuando se produce un carrusel que las pida
  (señalando, con laptop, con lupa, saludando, pensando). No pre-fabricar en lote.
- **Cómo generar más:** skill `banana`, `edit.py` desde `avatar/foto-real.jpg`, fondo verde
  `#00FF00`, luego chroma-key + cuadrar con PIL (receta en el historial). Prompt base: preservar
  su cara EXACTA sin deformar, polo piqué negro, estilo pixel sticker, contorno blanco.
- **Pendiente (cuando sea necesario):** versión **ícono monocromática terracota** (silueta
  simple) para tamaños chicos / grids.

## 4. Espaciado, forma, lienzo

- **Lienzo:** 1080×1350 (4:5 vertical IG). Reels 9:16 1080×1920.
- **Márgenes:** ~72-84px por lado. Nunca al borde (salvo las marcas "+" de esquina del
  arquetipo blueprint).
- **Radios:** ventana de mockup 14-18px · cards 16-22px · **pill de CTA totalmente redondeado**
  · chips 8-14px · badge kicker 6-8px.
- **Densidad:** editorial y airada. Máx 3 bloques por slide (titular + apoyo + prueba). No amontonar.

## 5. Arquetipos de slide (rotar entre ellos, ver §0)

- **A — Portada/Hook:** crema, label de sitio arriba, titular serif con UNA palabra itálica
  terracota, footer handle + hook itálico, dots.
- **B — Detalle/prueba (caballo de batalla):** badge kicker blush, titular+body izquierda,
  personaje pixel a la derecha, **tarjeta oscura de mockup** abajo (semáforo macOS, contenido
  específico), fila de stats.
- **C — Grid de iconos:** titular centrado, grilla de mascotas/props pixel con labels mono,
  pill terracota de cierre.
- **D — CTA (última slide):** pregunta serif con palabra itálica terracota + **pill terracota
  redondeado** ("Comenta IA"), hook "te leo en comentarios ↓".
- **E — Ecuación/flujo:** iconos pequeños unidos por + / = / →.
- **F — Blueprint/build:** marcas "+" de esquina, kicker en pill negra, screenshot rotado tipo
  pila de papeles.

La **tarjeta oscura de mockup** (arquetipo B) es el dispositivo #1 de credibilidad — dominarla
importa más que cualquier adorno.

## 6. Voz sobre el diseño (recordatorio)

Copy en **tuteo peruano** (ver `ig-content-system/ESTRATEGIA.md` §9). NUNCA voseo argentino
(las referencias @ai._kid lo usan — se roba el diseño, no la voz). Un solo CTA por pieza.

## 7. Qué NO hacer

- No teal en carruseles. No degradados. No más de un acento terracota por slide.
- No repetir el mismo layout/arquetipo en piezas seguidas.
- No copiar los pixeles ni la mascota de @ai._kid — usar el personaje propio.
- No amontonar. No texto crítico en las safe zones (dots abajo, handle del perfil arriba).
