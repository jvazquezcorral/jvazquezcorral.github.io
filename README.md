# jvazquezcorral.github.io

Personal website of Javier Vazquez-Corral. Plain HTML, CSS and a little JavaScript: no Jekyll, no build step.

## Edit content

| What | Where |
| --- | --- |
| Bio, links, address, CV highlights | `index.html` |
| Teaching | `teaching/index.html` (one `<div class="course">` per course, one `<li>` per year) |
| Publications | `papers.bib` |
| Paper PDFs | `assets/pdf/` |
| Full CV | `assets/pdf/VazquezCorral_Javier_CV.pdf` (replace the file, keep the name) |
| Photo | `assets/img/javier.jpg` (4:5, 640 × 800) |

### Add a paper

Paste its BibTeX entry into `papers.bib` next to the other papers of the same year. The site groups papers by year (newest first) and keeps the file order inside each year. Your name is highlighted automatically.

Optional fields add a venue tag and links under the paper. They are hidden from the BibTeX that visitors copy.

```bibtex
@inproceedings{serrano2026synclight,
  title     = {SyncLight: Single-Edit Multi-View Relighting},
  author    = {Serrano-Lozano, David and Bhattad, Anand and Herranz, Luis and Lalonde, Jean-Fran\c{c}ois and Vazquez-Corral, Javier},
  booktitle = {NeurIPS},
  year      = {2026},
  abbr      = {NeurIPS},
  arxiv     = {2601.16981},
  code      = {https://github.com/CVC-Color/synclight},
  website   = {https://color.cvc.uab.cat/synclight/},
}
```

- `abbr`: the venue tag shown on the left.
- `pdf`: a file in `assets/pdf/` (just the file name, e.g. `pdf = {ABC26.pdf}`) or a full URL.
- `arxiv`: the arXiv id.
- `code`, `website` (shown as "Project page"): full URLs.

Also available: `paper` (publisher page; otherwise `doi` or `url` is used), `demo`, `dataset`, `video`, `slides`, `poster`, `supp`.

LaTeX accents such as `{\'i}` or `{\c{c}}` are fine.

## Preview locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

The publication list is read from `papers.bib`, which browsers don't allow on `file://` pages, so open the site through the local server rather than double-clicking `index.html`.

## Publish

Push to `master`. `.github/workflows/deploy.yml` copies the repository to the `gh-pages` branch, which GitHub Pages serves (Settings → Pages → Deploy from a branch → `gh-pages`, as with the old site).

## Other files

- `publications/`, `cv/`: redirects from the old site's addresses.
- `404.html`: page shown for addresses that don't exist.
- The Google Analytics tag (`G-27MKYMLQ50`) is in the `<head>` of `index.html` and `teaching/index.html`.
