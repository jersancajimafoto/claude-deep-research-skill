#!/usr/bin/env python3
"""Tests for report_sections.py and the validators that use it."""

import os
import subprocess
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from report_sections import find_section, has_section, split_section

SCRIPTS = os.path.join(os.path.dirname(__file__), '..', 'scripts')
FIXTURES = os.path.join(os.path.dirname(__file__), 'fixtures')

REPORT = """\
# Title

## Resumen ejecutivo

Resumen [1].

### Subsección
Sigue dentro del resumen.

## Bibliografia

[1] Fuente. https://example.com/a

## Apéndice: Metodología

Proceso.
"""


class TestReportSections(unittest.TestCase):

    def test_spanish_heading_found(self):
        body = find_section(REPORT, 'executive_summary')
        self.assertIn('Resumen [1].', body)

    def test_subsections_stay_in_section(self):
        body = find_section(REPORT, 'executive_summary')
        self.assertIn('Sigue dentro del resumen.', body)
        self.assertNotIn('[1] Fuente', body)

    def test_accent_insensitive(self):
        # "Bibliografia" written without the accent
        self.assertIn('[1] Fuente', find_section(REPORT, 'bibliography'))

    def test_appendix_prefix(self):
        self.assertTrue(has_section(REPORT, 'methodology'))
        self.assertIn('Proceso.', find_section(REPORT, 'methodology'))

    def test_english_heading_found(self):
        self.assertIsNotNone(find_section('## Executive Summary\n\nText.\n', 'executive_summary'))

    def test_missing_section(self):
        self.assertIsNone(find_section(REPORT, 'recommendations'))
        self.assertFalse(has_section(REPORT, 'recommendations'))

    def test_level3_heading_does_not_count(self):
        self.assertFalse(has_section('### Scope & Methodology\n', 'methodology'))

    def test_split_section(self):
        before, body, after = split_section(REPORT, 'bibliography')
        self.assertIn('Resumen [1].', before)
        self.assertEqual(body.strip(), '[1] Fuente. https://example.com/a')
        self.assertTrue(after.startswith('## Apéndice: Metodología'))


class TestValidatorsAcceptSpanish(unittest.TestCase):

    def run_script(self, name, report):
        return subprocess.run(
            [sys.executable, os.path.join(SCRIPTS, name), '--report', report],
            capture_output=True, text=True,
        )

    def test_validate_report_spanish_passes(self):
        result = self.run_script('validate_report.py', os.path.join(FIXTURES, 'valid_report_es.md'))
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertNotIn('Missing sections', result.stdout)
        self.assertNotIn("Missing 'Bibliography'", result.stdout)

    def test_validate_report_english_still_passes(self):
        result = self.run_script('validate_report.py', os.path.join(FIXTURES, 'valid_report.md'))
        self.assertEqual(result.returncode, 0, result.stdout)

    def test_verify_citations_reads_spanish_bibliography(self):
        sys.path.insert(0, SCRIPTS)
        from pathlib import Path
        from verify_citations import CitationVerifier

        verifier = CitationVerifier(Path(os.path.join(FIXTURES, 'valid_report_es.md')))
        entries = verifier.extract_bibliography()
        self.assertEqual(len(entries), 10)
        self.assertEqual(entries[0]['title'], 'Test Research Advances')

    def test_verify_citations_reads_markdown_link_titles(self):
        sys.path.insert(0, SCRIPTS)
        from verify_citations import CitationVerifier

        verifier = CitationVerifier.__new__(CitationVerifier)
        verifier.errors = []
        verifier.content = (
            '## Bibliography\n\n'
            '[1] Anthropic (2026). [Use Claude Code in the cloud](https://code.claude.com/docs/en/x).\n'
        )
        entries = verifier.extract_bibliography()
        self.assertEqual(entries[0]['title'], 'Use Claude Code in the cloud')
        self.assertEqual(entries[0]['url'], 'https://code.claude.com/docs/en/x')


if __name__ == '__main__':
    unittest.main()
