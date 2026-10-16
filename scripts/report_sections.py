#!/usr/bin/env python3
"""
Report section lookup shared by the validation and conversion scripts.

Reports may be written in English or Spanish, so each logical section is
matched by any of its heading aliases. Matching ignores case and accents,
so "Bibliografía" and "Bibliografia" are both recognised.
"""

import re
import unicodedata

# Logical section key -> accepted heading text (matched as a prefix)
SECTION_ALIASES = {
    'executive_summary': ['Executive Summary', 'Resumen ejecutivo'],
    'introduction': ['Introduction', 'Introducción'],
    'main_analysis': ['Main Analysis', 'Análisis principal'],
    'synthesis': ['Synthesis', 'Síntesis'],
    'limitations': ['Limitations', 'Limitaciones'],
    'recommendations': ['Recommendations', 'Recomendaciones'],
    'conclusion': ['Conclusion', 'Conclusión', 'Conclusiones'],
    'bibliography': ['Bibliography', 'References', 'Bibliografía', 'Referencias'],
    'methodology': ['Methodology', 'Metodología'],
    'counterevidence': ['Counterevidence Register', 'Registro de contraevidencia'],
    'claims_evidence_table': ['Claims-Evidence Table', 'Tabla de afirmaciones y evidencia'],
}

# A level-1 or level-2 heading ends a section; ### subsections do not
_SECTION_END = r'(?=^#{1,2}\s|\Z)'


def strip_accents(text: str) -> str:
    """Remove diacritics so accented and unaccented spellings compare equal."""
    decomposed = unicodedata.normalize('NFD', text)
    return ''.join(ch for ch in decomposed if unicodedata.category(ch) != 'Mn')


def _alias_regex(alias: str) -> str:
    """Regex for an alias that also matches its accented/unaccented variants."""
    parts = []
    for ch in alias:
        base = strip_accents(ch)
        if base != ch:
            parts.append(f'[{re.escape(base)}{re.escape(ch)}]')
        elif ch == ' ':
            parts.append(r'\s+')
        else:
            parts.append(re.escape(ch))
    return ''.join(parts)


def heading_regex(key: str) -> str:
    """Alternation of all aliases for a logical section."""
    return '(?:' + '|'.join(_alias_regex(a) for a in SECTION_ALIASES[key]) + ')'


def has_section(content: str, key: str) -> bool:
    """True if a level-2 heading anywhere mentions the section."""
    pattern = rf'^##(?!#).*{heading_regex(key)}'
    return re.search(pattern, content, re.IGNORECASE | re.MULTILINE) is not None


def find_section(content: str, key: str):
    """Return the body of the first level-2 section whose heading starts with
    one of the aliases (optionally after "Appendix:"/"Apéndice:"), or None."""
    pattern = (
        rf'^##(?!#)\s*(?:(?:Appendix|Ap[eé]ndice)\s*[A-Z]?\s*:\s*)?'
        rf'{heading_regex(key)}[^\n]*\n(.*?){_SECTION_END}'
    )
    match = re.search(pattern, content, re.IGNORECASE | re.MULTILINE | re.DOTALL)
    return match.group(1) if match else None


def split_section(content: str, key: str):
    """Split content into (before, section_body, after) around a section.

    The heading line itself is dropped. Returns (content, '', '') when the
    section is absent.
    """
    pattern = rf'^##(?!#)\s*{heading_regex(key)}[^\n]*\n?'
    match = re.search(pattern, content, re.IGNORECASE | re.MULTILINE)
    if not match:
        return content, '', ''
    rest = content[match.end():]
    end = re.search(r'^#{1,2}\s', rest, re.MULTILINE)
    if not end:
        return content[:match.start()], rest, ''
    return content[:match.start()], rest[:end.start()], rest[end.start():]
