# Design DNA — Jers | IA + Automatización

Extraído de 83 screenshots de carruseles IG (`marcas/jers-ia/referencias/ref-01.png` … `ref-83.png`).

**Aviso sobre el corpus:** no los 83 son de la misma cuenta. El núcleo real (~35-40 refs) es
**@ai._kid (claura-ai.com)** — cream + terracota + negro cálido, con carruseles editoriales
"headline serif + mockup oscuro embebido". El resto son cuentas primas mezcladas para minar
patrones: @francisco.carosia (mismo paleta, mascota 3D distinta), @ramiro.cubria (fondo
full-negro, personajes voxel), @juanbertorello.ia (papel cream + cards de GitHub),
una serie "blueprint" con marcas de esquina tipo plano técnico (cuenta no visible en el
recorte), @soydiegoosorio (avatar 3D realista, stickers naranjas), un deck "42 skills / 7
crews" con colores pastel por departamento, y dos outliers sin cream/terracota
(@rifqieh gris claro, @luzzidigital gris concreto) — estos dos quedan **excluidos** del ADN
core. Esta guía documenta el sistema **@ai._kid + primos cercanos**, y marca aparte lo
que es de otra cuenta.

---

## 1. Paleta

| Token | Hex aprox. | Uso |
|---|---|---|
| Cream (fondo base) | `#EFEAE0` | 90% del lienzo en casi todas las slides del core |
| Terracota (acento único) | `#C97B58` | UNA palabra en itálica por headline, pills de CTA, bullets, stats, dot de progreso |
| Terracota profundo | `#B8654A` | variante en algunos botones |
| Negro cálido | `#1C1712` | texto de titular no-acento, énfasis en negrita |
| Fondo mockup oscuro | `#121212` | solo dentro de las "tarjetas app" embebidas |
| Blush secundario | `#E7D6CB` | fondo de badges kicker, un bloque de CTA |
| Verde éxito | `#3C8C52` | solo dentro de mockups oscuros (checks, %, "listo") |

**¿Aparece el teal? NO.** Confirmado tras revisar las 83 imágenes: la paleta de @ai._kid y sus
primos cercanos es estrictamente cream / terracota / negro cálido. El único verde-azulado que
aparece en todo el set es el header nativo de WhatsApp dentro de UN screenshot de conversación
(ref-20) — es interfaz real capturada, no una decisión de marca. El púrpura aparece dos veces,
siempre dentro de ilustraciones de mockup oscuro embebidas (una esfera "command center", un
stack de carpetas arcoíris) — nunca como fondo ni como acento tipográfico.

**Regla de oro:** terracota se usa **una sola vez por slide**, siempre sobre la palabra que
más importa del titular. Nunca se dispersa decorativamente. Esa disciplina es la que hace
que el sistema se sienta premium y no "plantilla colorida".

---

## 2. Sistema tipográfico

| Rol | Candidatos | Uso |
|---|---|---|
| Serif display | **Fraunces** / Canela Deck / Freight Display Pro | palabra(s) de titular sin acento |
| Serif display itálica | **Fraunces Italic** / Newsreader Italic | la frase-acento en terracota + notas de pie ("desliza →") + números de stat |
| Sans grotesk body | **Inter** / General Sans / Neue Montreal | párrafo de cuerpo, texto de mockups |
| Monoespaciada | **JetBrains Mono** / IBM Plex Mono | kickers ("01/08 — AGENTE 1"), contenido de terminal, tags |
| (secundaria, cuentas outlier) | Archivo Black / Anton | titulares gritones — NO es la voz principal de ai._kid |

**Escala:** titular serif ~64-76px (lienzo 1080w) · subtítulo itálico ~28-34px · body sans
~22-26px · kicker mono ~13-15px mayúsculas trackeadas · número de stat itálico ~34-42px ·
caption de stat mono ~11-12px.

---

## 3. Espaciado, forma y grilla

- **Lienzo:** 1080×1350 (4:5, vertical nativo de carrusel IG).
- **Márgenes:** generosos, ~72-84px por lado (~7% del ancho) — nunca al borde salvo las
  marcas de esquina del archetype "blueprint".
- **Ritmo vertical:** bloques separados por 40-64px; kicker→titular ~48-64px; titular→body
  ~24-32px; body→mockup ~48-56px.
- **Border-radius:** ventanas de mockup 14-18px · cards de contenido 16-22px · **pill de CTA
  totalmente redondeado** (la forma más repetida del sistema) · chips de tag 8-14px · badge
  kicker 6-8px (rectángulo apenas redondeado, no pill completo).
- **Densidad:** editorial y airada — casi siempre 1 titular + 1 frase de apoyo + 1 prueba
  visual por slide. Nunca se amontona.

---

## 4. Estilo (cualitativo)

- **Mood:** confiado, editorial, premium en voz baja — más revista boutique que "dashboard
  bro de IA", pese a hablar de agentes e IA.
- **Personalidad:** tensión central entre lo editorial (itálicas serif, whitespace) y lo
  builder/técnico (mockups de terminal, kickers monoespaciados). Esa mezcla ES la marca.
- **Composición:** jerarquía estricta — kicker → titular (con una sola palabra en itálica
  terracota) → una frase de apoyo → una prueba visual (mockup / stat / grid de iconos).
- **Whitespace:** el cream se trata como protagonista, no como espacio sobrante.
- **Contraste:** sistema claro-sobre-claro (cream + negro cálido + un acento) puntuado por
  "islas" oscuras (las tarjetas de mockup) que funcionan como evidencia — nunca fondo
  completo en las slides propias de @ai._kid (el fondo 100% negro es patrón de OTRAS cuentas
  del corpus, ver archetype G).

---

## 5. Arquetipos de slide

### A — Portada / Hook
Cream, label de sitio arriba ("🔗 claura-ai.com"), titular serif de 2-3 líneas con UNA frase
itálica terracota, subtítulo itálico opcional, footer con handle abajo-izq + hook itálico
terracota abajo-der ("deslizá →"), dots de paginación.

### B — Detalle numerado de agente/paso (el caballo de batalla)
Cream + badge kicker blush ("01/08 — AGENTE 1 · ICP FINDER"), titular+body a la izquierda,
mascota pixel-art con flecha "dibujada a mano" a la derecha, **tarjeta de mockup oscura**
grande abajo (ventana con los 3 puntos tipo macOS, contenido: chat, kanban, tabla CRM,
dashboard A/B), fila de 2-3 stats (número itálico terracota + caption mono), footer.

### C — Grid de iconos
Cream, titular+subtítulo centrados, grilla 2x4 de mascotas pixel-art naranjas (cada una con
un prop distinto: binoculares=research, corona=estrategia, bolsa=landing), label mono debajo
de cada una, pill terracota de cierre ("Todo conectado. Un solo sistema."), footer.

### D — CTA / engagement (siempre la última slide)
Cream, pregunta serif grande con UNA palabra itálica terracota, bloque blush o **pill
terracota totalmente redondeado** con instrucción en negrita blanca ("Comentá AGENTES"),
frase de apoyo corta, footer con hook "te espero en comments ↓".

### E — Ecuación de iconos / flujo
Cream, muy minimalista: titular + fila de iconos pequeños unidos por +/=/→ (WhatsApp verde +
asterisco Claude terracota + ícono de reglas + ícono de base de datos = "CRM automático").
Los únicos colores fuera de la paleta son los propios de cada ícono de marca (WhatsApp, etc.)
y solo como glifos diminutos.

### F — "Blueprint" / build técnico (marcas de esquina)
Cream con **marcas + de esquina** en las 4 puntas, kicker en pill negra sólida ("EL BUILD",
"PASO 1 · EL CEREBRO"), titular sans bold en minúsculas con palabra terracota, tarjeta de
screenshot rotada con sombra tipo "pila de papeles", footer "DESLIZA →" en mono trackeado.

### G — Statement/equipo full-oscuro (cuentas outlier, NO el default de ai._kid)
Fondo negro full-bleed, titular sans bold blanco+naranja, lista de checks (✓) naranjas,
personaje 3D/voxel abajo-derecha, card de dashboard embebida. **Nota:** este NO es el patrón
por defecto de @ai._kid (que aísla lo oscuro a una tarjeta sobre cream) — inclúyelo solo como
variante opcional "modo oscuro" si se quiere, no como base.

### H — Vitrina de repo de GitHub (cuenta outlier @juanbertorello.ia)
Cream con grano de papel, cinta/bookmark terracota arriba-izq como marcador "Plugin N",
numeral gigante en marca de agua terracota pálida detrás del titular, screenshot real de
GitHub, tags en pill, cierre itálico.

---

## 6. Motivos / firmas recurrentes

1. **Mascota pixel-art naranja de @ai._kid** — humanoide 8-bit, relleno terracota sólido,
   ojos cuadrados negros, contorno blanco tipo sticker con sombra suave. Docenas de poses/props.
   *No confundir* con la mascota 3D chunky de @francisco.carosia, la mascota voxel/LEGO de la
   serie blueprint, ni la mascota de disco plano de @juanbertorello.ia — son de otras cuentas.
2. **Dots de paginación** — chrome estándar de IG, pero la composición siempre respeta el
   espacio debajo de ellos.
3. **Marcas + de esquina / crosshairs** — arquetipo F y la serie blueprint, prestado del
   dibujo técnico, refuerza sensación "ingenierizada".
4. **Kickers monoespaciados** — badge blush (estilo propio de ai._kid) o pill negra sólida
   (estilo de la sub-serie blueprint), siempre justo encima del titular.
5. **Handle abajo-izquierda + hook itálico serif abajo-derecha** — el patrón de cierre más
   consistente de todo el corpus ai._kid.
6. **Tarjeta de mockup oscuro "prueba"** — ventana redondeada con puntos tipo macOS,
   contenido de producto ficticio pero hiper-específico. Es el dispositivo de credibilidad
   de todo el sistema.
7. **Pill de CTA terracota totalmente redondeado** — el elemento "interactivo" más repetido,
   siempre para embudo comentario→DM.
8. **Exactamente una palabra/frase itálica terracota por titular** — la regla de mayor
   apalancamiento para copiar.

---

## 7. Cómo reproducir este look (checklist rápido)

1. Lienzo 1080×1350, fondo `#EFEAE0` cream con textura sutil de papel.
2. Titular en Fraunces (o similar serif transicional cálido), negro cálido `#1C1712`.
3. Elegí UNA palabra/frase del titular y ponela en Fraunces Italic, color terracota `#C97B58`.
   No agregues más color.
4. Cuerpo en Inter/General Sans, 22-26px, con una cláusula en negrita.
5. Si hay "prueba": armá una tarjeta oscura `#121212` con radio 14-18px, puntos de semáforo
   macOS, y contenido de producto ficticio pero específico (números reales, nombres reales).
6. Kicker opcional: badge blush `#E7D6CB` o pill negra, mono JetBrains/IBM Plex, mayúsculas.
7. CTA: pill totalmente redondeado, fill terracota, texto blanco bold, centrado.
8. Footer siempre: handle bold sans abajo-izq + hook itálico serif abajo-der + dots de
   paginación centrados abajo.
9. Márgenes generosos (~75px), nunca amontonar más de 3 bloques de contenido por slide.
10. Nada de teal. Nada de degradados. Un acento, una vez, por slide.
