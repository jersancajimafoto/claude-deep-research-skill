#!/usr/bin/env python3
"""Tests for verify_html.py (TagBalanceParser and HTMLVerifier)."""

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from verify_html import HTMLVerifier, TagBalanceParser


def parse(html):
    """Feed HTML through TagBalanceParser, return (unclosed, stray_closers)."""
    parser = TagBalanceParser()
    parser.feed(html)
    parser.close()
    return parser.unclosed, parser.stray_closers


class TestTagBalanceParser(unittest.TestCase):
    def test_balanced_html_reports_nothing(self):
        unclosed, stray = parse(
            '<html><head><title>x</title></head>'
            '<body><div><p>hi</p></div></body></html>'
        )
        self.assertEqual(unclosed, [])
        self.assertEqual(stray, [])

    def test_void_elements_are_ignored(self):
        unclosed, stray = parse(
            '<div><meta charset="utf-8"><br><img src="a.png"><hr></div>'
        )
        self.assertEqual(unclosed, [])
        self.assertEqual(stray, [])

    def test_unclosed_tag_reported_with_line(self):
        unclosed, stray = parse('<body>\n<div class="section">\n<p>text</p>\n</body>')
        self.assertIn(('div', 2), unclosed)
        self.assertEqual(stray, [])

    def test_stray_closer_reported(self):
        unclosed, stray = parse('<body><p>text</p></div></body>')
        self.assertEqual(unclosed, [])
        self.assertEqual(stray[0][0], 'div')

    def test_nested_unclosed_inside_matched_pair(self):
        unclosed, stray = parse('<div><span>text</div>')
        self.assertEqual([tag for tag, _ in unclosed], ['span'])
        self.assertEqual(stray, [])

    def test_multiple_unclosed_tags(self):
        unclosed, _ = parse('<div><section><article>text')
        self.assertEqual(
            sorted(tag for tag, _ in unclosed),
            ['article', 'div', 'section'],
        )


VALID_MD = """# Test Report

## Executive Summary

Some finding with a citation [1].

## Bibliography

[1] A Title - https://example.com/paper
"""

VALID_HTML = """<html>
<head><title>Test Report</title></head>
<body>
<div class="header">Test Report</div>
<div class="content">
<div class="section"><h2 class="section-title">Executive Summary</h2>
<p>Some finding with a citation [1].</p>
</div>
</div>
<div class="bibliography">
<div class="bib-entry">[1] <a href="https://example.com/paper">A Title</a></div>
</div>
</body>
</html>
"""


class TestHTMLVerifier(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def _verify(self, html, md):
        html_path = Path(self.tmpdir) / 'report.html'
        md_path = Path(self.tmpdir) / 'report.md'
        html_path.write_text(html)
        md_path.write_text(md)
        verifier = HTMLVerifier(html_path, md_path)
        ok = verifier.verify()
        return ok, verifier.errors, verifier.warnings

    def test_valid_report_passes(self):
        ok, errors, warnings = self._verify(VALID_HTML, VALID_MD)
        self.assertTrue(ok, f'unexpected errors: {errors}')
        self.assertEqual(warnings, [])

    def test_unreplaced_placeholder_is_error(self):
        html = VALID_HTML.replace('Test Report</title>', '{{TITLE}}</title>')
        ok, errors, _ = self._verify(html, VALID_MD)
        self.assertFalse(ok)
        self.assertTrue(any('placeholder' in e.lower() for e in errors))

    def test_emoji_is_error(self):
        html = VALID_HTML.replace('Some finding', 'Some finding \U0001F600')
        ok, errors, _ = self._verify(html, VALID_MD)
        self.assertFalse(ok)
        self.assertTrue(any('emoji' in e.lower() for e in errors))

    def test_missing_structure_element_is_error(self):
        html = VALID_HTML.replace('class="header"', 'class="not-header"')
        ok, errors, _ = self._verify(html, VALID_MD)
        self.assertFalse(ok)
        self.assertTrue(any('header' in e for e in errors))

    def test_missing_executive_summary_is_error(self):
        html = VALID_HTML.replace('Executive Summary', 'Resumen')
        ok, errors, _ = self._verify(html, VALID_MD)
        self.assertFalse(ok)
        self.assertTrue(any('Executive Summary' in e for e in errors))

    def test_missing_citations_is_error(self):
        html = VALID_HTML.replace('citation [1]', 'citation')
        ok, errors, _ = self._verify(html, VALID_MD)
        self.assertFalse(ok)
        self.assertTrue(any('citation' in e.lower() for e in errors))

    def test_unclosed_div_is_warning(self):
        html = VALID_HTML.replace(
            '<p>Some finding with a citation [1].</p>\n</div>',
            '<p>Some finding with a citation [1].</p>',
        )
        ok, _, warnings = self._verify(html, VALID_MD)
        self.assertTrue(any('Unclosed <div>' in w for w in warnings))

    def test_missing_bibliography_is_error(self):
        html = VALID_HTML.replace('class="bibliography"', 'class="refs"')
        ok, errors, _ = self._verify(html, VALID_MD)
        self.assertFalse(ok)
        self.assertTrue(any('Bibliography' in e for e in errors))


if __name__ == '__main__':
    unittest.main()
