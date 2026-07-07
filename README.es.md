# Habilidad de Investigación Profunda para Claude Code

*Leer en otros idiomas: [English](README.md)*

Motor de investigación de nivel empresarial para Claude Code. Produce reportes respaldados por citas, con puntuación de credibilidad de fuentes, búsqueda en múltiples proveedores y validación automatizada.

## Instalación

```bash
# Clonar en el directorio de habilidades de Claude Code
git clone https://github.com/199-biotechnologies/claude-deep-research-skill.git ~/.claude/skills/deep-research
```

No se requieren dependencias adicionales para el uso básico.

### Claude Code en la web / móvil (sesiones en la nube)

Este repositorio también registra la habilidad como habilidad de proyecto mediante `.claude/skills/deep-research/` (enlaces simbólicos a la raíz del repositorio). Cualquier sesión de Claude Code en la nube abierta sobre este repositorio — incluidas las sesiones iniciadas desde la app móvil de Claude — carga la habilidad automáticamente, sin instalación. Basta abrir una sesión sobre este repositorio y pedir `deep research on ...`.

### Opcional: search-cli (búsqueda multiproveedores)

Para búsqueda agregada en Brave, Serper, Exa, Jina y Firecrawl:

```bash
brew tap 199-biotechnologies/tap && brew install search-cli
search config set keys.brave TU_CLAVE  # configure al menos un proveedor
```

## Uso

```
deep research on the current state of quantum computing
```

```
deep research in ultradeep mode: compare PostgreSQL vs Supabase for our stack
```

> **Nota:** Los ejemplos se muestran en inglés porque frases como "deep research" son las que activan la habilidad (ver `SKILL.md`). La pregunta de investigación en sí puede formularse en español.

## Modos de investigación

| Modo | Fases | Duración | Ideal para |
|------|-------|----------|------------|
| Quick | 3 | 2-5 min | Exploración inicial |
| Standard | 6 | 5-10 min | La mayoría de las preguntas de investigación |
| Deep | 8 | 10-20 min | Temas complejos, decisiones críticas |
| UltraDeep | 8+ | 20-45 min | Reportes exhaustivos, máximo rigor |

## Pipeline

Alcance &rarr; Plan &rarr; **Recuperación** (búsqueda paralela + agentes) &rarr; Triangulación &rarr; Refinamiento del esquema &rarr; Síntesis &rarr; Crítica (con retroceso) &rarr; Refinamiento &rarr; Empaquetado

Características clave:
- **Paso 0**: Obtiene la fecha actual antes de las búsquedas (evita suposiciones de año desactualizadas del entrenamiento)
- **Recuperación paralela**: 5-10 búsquedas concurrentes + 2-3 subagentes enfocados que devuelven objetos de evidencia estructurados
- **First Finish Search**: Umbrales de calidad adaptativos según el modo
- **Retroceso desde la crítica**: La Fase 6 puede regresar a la Fase 3 con consultas delta si se detectan vacíos críticos
- **Red teaming multipersona**: Practicante Escéptico, Revisor Adversarial, Ingeniero de Implementación (Deep/UltraDeep)
- **Citas persistidas en disco**: `sources.json` sobrevive la compactación de contexto y los agentes de continuación

## Salida

Los reportes se guardan en `~/Documents/[Tema]_Research_[Fecha]/`:
- Markdown (fuente primaria de verdad)
- HTML (estilo McKinsey, se abre automáticamente en el navegador)
- PDF (impresión profesional vía WeasyPrint)

Los reportes de más de 18 000 palabras continúan automáticamente mediante generación recursiva de agentes con preservación de contexto.

## Estándares de calidad

- 10+ fuentes, 3+ por cada afirmación importante
- Resumen ejecutivo de 200-400 palabras
- Hallazgos de 600-2000 palabras cada uno, priorizando prosa (>=80 %)
- Bibliografía completa con URLs, sin texto de relleno
- Validación automatizada: `validate_report.py` (9 verificaciones) + `verify_citations.py` (detección de DOI/URL/alucinaciones)
- Ciclo de validación: validar &rarr; corregir &rarr; reintentar (máximo 3 ciclos)

## Herramientas de búsqueda

| Herramienta | Prioridad | Configuración |
|-------------|-----------|---------------|
| search-cli | **Primaria** — todas las búsquedas pasan primero por aquí | `brew install search-cli` + claves API |
| WebSearch | Respaldo — si search-cli falla o alcanza el límite de solicitudes | Ninguna (integrada) |
| Exa MCP | Opcional — búsqueda semántica/neuronal junto a search-cli | Configuración MCP |

## Arquitectura

```
deep-research/
├── SKILL.md                          # Punto de entrada de la habilidad (compacto, ~100 líneas)
├── reference/
│   ├── methodology.md                # Detalles del pipeline de 8 fases
│   ├── report-assembly.md            # Estrategia de generación progresiva
│   ├── quality-gates.md              # Estándares de validación
│   ├── html-generation.md            # Conversión a HTML estilo McKinsey
│   ├── continuation.md               # Protocolo de autocontinuación
│   └── weasyprint_guidelines.md      # Generación de PDF
├── templates/
│   ├── report_template.md            # Plantilla de estructura del reporte
│   └── mckinsey_report_template.html # Plantilla HTML del reporte
├── scripts/
│   ├── validate_report.py            # Validador de estructura (9 verificaciones)
│   ├── verify_citations.py           # Verificador de DOI/URL/alucinaciones
│   ├── source_evaluator.py           # Puntuación de credibilidad de fuentes
│   ├── citation_manager.py           # Gestión de citas
│   ├── md_to_html.py                 # Conversor de Markdown a HTML
│   ├── verify_html.py                # Verificación de HTML
│   └── research_engine.py            # Motor central de orquestación
└── tests/
    └── fixtures/                     # Reportes de prueba
```

## Historial de versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 2.3.1 | 2026-03-19 | Armonización de plantillas y validadores, evidencia estructurada, retroceso desde la crítica, red teaming multipersona |
| 2.3 | 2026-03-19 | Armonización de contratos, integración de search-cli, detección dinámica de año, citas persistidas en disco, ciclos de validación |
| 2.2 | 2025-11-05 | Sistema de autocontinuación para longitud ilimitada |
| 2.1 | 2025-11-05 | Ensamblado progresivo de archivos |
| 1.0 | 2025-11-04 | Versión inicial |

## Licencia

MIT — modifíquela según lo necesite para su flujo de trabajo.
