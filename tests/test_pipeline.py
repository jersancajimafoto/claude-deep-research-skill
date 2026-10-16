#!/usr/bin/env python3
"""End-to-end test of the evidence pipeline:
init-run -> register-source -> evidence add -> extract claims -> verify -> HTML.

The unit tests cover each script alone; this test checks that their outputs
actually connect, which is where the citation-linking gap went unnoticed.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

SCRIPTS = os.path.join(os.path.dirname(__file__), '..', 'scripts')
sys.path.insert(0, SCRIPTS)

from md_to_html import convert_markdown_to_html

URL_A = 'https://example.com/docs/remote-control'
URL_B = 'https://example.com/docs/cloud?utm_source=newsletter'

# Spanish report; bibliography uses markdown links as export-bibliography does.
# [2]'s URL omits the tracking parameter it was registered with, so linking
# must go through the same canonicalization as register-source.
REPORT = f"""\
# Informe

## Resumen ejecutivo

Remote Control ejecuta la sesión en tu propia máquina y conserva el acceso a los archivos locales [1].

## Hallazgo 1: Nube

Las sesiones en la nube siguen funcionando después de cerrar el portátil [2].

## Bibliografía

[1] Example (2026). [Remote Control]({URL_A}). Docs.

[2] Example (2026). [Cloud sessions](https://example.com/docs/cloud). Docs.

## Apéndice: Metodología

Se consultaron dos páginas de documentación.
"""


def run(script: str, *args: str, expect_fail: bool = False) -> dict:
    result = subprocess.run(
        [sys.executable, os.path.join(SCRIPTS, script), *args],
        capture_output=True, text=True,
    )
    if result.returncode != 0 and not expect_fail:
        raise RuntimeError(f'{script} exit {result.returncode}: {result.stderr}\n{result.stdout}')
    if expect_fail:
        assert result.returncode != 0, f'{script} unexpectedly succeeded: {result.stdout}'
    return json.loads(result.stdout)


class TestPipeline(unittest.TestCase):

    def setUp(self):
        self.dir = tempfile.mkdtemp()
        run('citation_manager.py', 'init-run', '--out-dir', self.dir, '--query', 'q', '--mode', 'quick')
        self.report = os.path.join(self.dir, 'report.md')
        with open(self.report, 'w') as f:
            f.write(REPORT)

    def tearDown(self):
        shutil.rmtree(self.dir, ignore_errors=True)

    def register(self, url: str) -> str:
        out = run('citation_manager.py', 'register-source',
                  '--json', json.dumps({'raw_url': url, 'title': 't'}), '--dir', self.dir)
        return out['source_id']

    def add_evidence(self, source_id: str, quote: str) -> None:
        run('evidence_store.py', 'add', '--json', json.dumps({
            'source_id': source_id, 'quote': quote, 'evidence_type': 'paraphrase', 'locator': 'intro',
        }), '--dir', self.dir)

    def claims(self) -> list[dict]:
        with open(os.path.join(self.dir, 'claims.jsonl')) as f:
            return [json.loads(line) for line in f if line.strip()]

    def test_claims_link_to_registered_sources(self):
        sid_a = self.register(URL_A)
        sid_b = self.register(URL_B)

        out = run('extract_claims.py', 'extract', '--report', self.report, '--dir', self.dir)
        self.assertEqual(out['sources_linked'], 2)
        self.assertEqual(out['unresolved_citations'], [])

        by_section = {c['section_id']: c for c in self.claims()}
        self.assertEqual(by_section['executive_summary']['cited_source_ids'], [sid_a])
        self.assertEqual(by_section['finding_1']['cited_source_ids'], [sid_b])
        # Bibliography entries and the methodology appendix are not claims
        self.assertNotIn('bibliography', by_section)
        self.assertNotIn('methodology', by_section)

    def test_strict_verify_passes_with_matching_evidence(self):
        sid_a = self.register(URL_A)
        sid_b = self.register(URL_B)
        self.add_evidence(sid_a, 'Remote Control ejecuta la sesión en tu máquina y conserva el acceso a los archivos locales.')
        self.add_evidence(sid_b, 'Las sesiones en la nube siguen funcionando después de cerrar el portátil.')

        run('extract_claims.py', 'extract', '--report', self.report, '--dir', self.dir)
        out = run('verify_claim_support.py', 'verify', '--dir', self.dir, '--strict')

        self.assertEqual(out['status'], 'pass')
        self.assertTrue(out['delivery_ready'])
        self.assertEqual(out['support_status_counts'], {'supported': 2})

    def test_strict_verify_fails_on_uncited_claim(self):
        self.register(URL_A)
        self.register(URL_B)
        with open(self.report, 'a') as f:
            f.write('\n## Hallazgo 2: Extra\n\nEl producto tiene cuarenta millones de usuarios activos en Europa.\n')

        run('extract_claims.py', 'extract', '--report', self.report, '--dir', self.dir)
        out = run('verify_claim_support.py', 'verify', '--dir', self.dir, '--strict', expect_fail=True)

        self.assertEqual(out['status'], 'fail')
        self.assertFalse(out['delivery_ready'])
        self.assertGreaterEqual(out['factual_unsupported'], 1)

    def test_link_after_late_source_registration(self):
        out = run('extract_claims.py', 'extract', '--report', self.report, '--dir', self.dir)
        self.assertEqual(out['sources_linked'], 0)
        self.assertEqual(out['unresolved_citations'], [1, 2])

        self.register(URL_A)
        self.register(URL_B)
        out = run('extract_claims.py', 'link', '--report', self.report, '--dir', self.dir)

        self.assertEqual(out['unresolved_citations'], [])
        self.assertTrue(all(c['cited_source_ids'] for c in self.claims()))

    def test_html_keeps_appendix_out_of_bibliography(self):
        content_html, bib_html = convert_markdown_to_html(REPORT)

        self.assertIn('Metodología', content_html)
        self.assertNotIn('Metodología', bib_html)
        self.assertIn(f'<a href="{URL_A}" target="_blank">Remote Control</a>', bib_html)
        self.assertEqual(bib_html.count('class="bib-entry"'), 2)


if __name__ == '__main__':
    unittest.main()
