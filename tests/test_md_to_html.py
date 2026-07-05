#!/usr/bin/env python3
"""Tests for md_to_html.py markdown-to-HTML conversion."""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from md_to_html import convert_markdown_to_html
from verify_html import TagBalanceParser

FIXTURES = os.path.join(os.path.dirname(__file__), 'fixtures')
TEMPLATE = os.path.join(
    os.path.dirname(__file__), '..', 'templates', 'mckinsey_report_template.html'
)


def convert(md):
    """Shorthand: convert markdown, return (content_html, bibliography_html)."""
    return convert_markdown_to_html(md)


def unclosed_tags(html):
    """Return list of unclosed tags found by TagBalanceParser."""
    parser = TagBalanceParser()
    parser.feed(html)
    parser.close()
    return parser.unclosed


class TestSections(unittest.TestCase):
    def test_section_heading_becomes_div_with_title(self):
        content, _ = convert('## Findings\n\nSome text.\n')
        self.assertIn('<div class="section"><h2 class="section-title">Findings</h2>', content)

    def test_subsection_headings(self):
        content, _ = convert('## Findings\n\n### Detail\n\n#### Fine Detail\n')
        self.assertIn('<h3 class="subsection-title">Detail</h3>', content)
        self.assertIn('<h4 class="subsubsection-title">Fine Detail</h4>', content)

    def test_front_matter_before_first_section_is_dropped(self):
        content, _ = convert('# Title\n\nintro text\n\n## Findings\n\nBody.\n')
        self.assertNotIn('intro text', content)
        self.assertIn('Body.', content)

    def test_each_section_div_is_closed(self):
        md = '## One\n\nText one.\n\n## Two\n\nText two.\n\n## Three\n\nText three.\n'
        content, _ = convert(md)
        self.assertEqual(content.count('<div class="section">'), 3)
        self.assertEqual(unclosed_tags(content), [])

    def test_executive_summary_gets_merged_class(self):
        md = '## Executive Summary\n\nSummary text.\n\n## Findings\n\nBody.\n'
        content, _ = convert(md)
        self.assertIn('<div class="section executive-summary">', content)
        # Regression: the old wrapper div was never closed
        self.assertEqual(unclosed_tags(content), [])


class TestInlineFormatting(unittest.TestCase):
    def test_bold_italic_and_code(self):
        content, _ = convert('## S\n\n**bold** and *ital* and `code`.\n')
        self.assertIn('<strong>bold</strong>', content)
        self.assertIn('<em>ital</em>', content)
        self.assertIn('<code>code</code>', content)

    def test_text_wrapped_in_paragraphs(self):
        content, _ = convert('## S\n\nA plain line.\n')
        self.assertIn('<p>A plain line.', content)


class TestLists(unittest.TestCase):
    def test_unordered_list(self):
        content, _ = convert('## S\n\n- alpha\n- beta\n\nAfter.\n')
        self.assertIn('<ul>', content)
        self.assertIn('<li>alpha</li>', content)
        self.assertIn('<li>beta</li>', content)
        self.assertIn('</ul>', content)

    def test_ordered_list(self):
        content, _ = convert('## S\n\n1. first\n2. second\n\nAfter.\n')
        self.assertIn('<ol>', content)
        self.assertIn('<li>first</li>', content)
        self.assertIn('</ol>', content)


class TestTables(unittest.TestCase):
    def test_table_with_header_and_rows(self):
        md = '## S\n\n| Col A | Col B |\n|-------|-------|\n| a1 | b1 |\n\nAfter.\n'
        content, _ = convert(md)
        self.assertIn('<table>', content)
        self.assertIn('<th>Col A</th>', content)
        self.assertIn('<td>a1</td>', content)
        self.assertIn('</tbody></table>', content)
        # Separator row must not leak into output
        self.assertNotIn('---', content)


class TestBibliography(unittest.TestCase):
    def test_split_from_content(self):
        md = '## S\n\nBody [1].\n\n## Bibliography\n\n[1] A Title - https://example.com/x\n'
        content, bib = convert(md)
        self.assertNotIn('bib-entry', content)
        self.assertIn('<div class="bibliography-content">', bib)

    def test_entry_becomes_link(self):
        md = '## S\n\nBody.\n\n## Bibliography\n\n[1] A Title - https://example.com/x\n'
        _, bib = convert(md)
        self.assertIn('<span class="bib-number">[1]</span>', bib)
        self.assertIn('<a href="https://example.com/x" target="_blank">A Title</a>', bib)

    def test_empty_bibliography_returns_empty(self):
        _, bib = convert('## S\n\nBody only.\n')
        self.assertEqual(bib, '')


class TestFullPipeline(unittest.TestCase):
    def test_fixture_report_produces_balanced_html(self):
        """Regression test: full template render must have no unclosed tags."""
        with open(os.path.join(FIXTURES, 'valid_report.md')) as f:
            md = f.read()
        with open(TEMPLATE) as f:
            template = f.read()

        content, bib = convert(md)
        html = template
        for placeholder, value in (
            ('{{TITLE}}', 'Test Report'),
            ('{{DATE}}', '2026-01-01'),
            ('{{CONTENT}}', content),
            ('{{BIBLIOGRAPHY}}', bib),
            ('{{SOURCE_COUNT}}', '7'),
            ('{{METRICS_DASHBOARD}}', ''),
        ):
            html = html.replace(placeholder, value)

        self.assertEqual(unclosed_tags(html), [])


if __name__ == '__main__':
    unittest.main()
