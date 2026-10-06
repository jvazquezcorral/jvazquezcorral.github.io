/* Publications: reads papers.bib and lists the papers by year. No dependencies. */
(function () {
  "use strict";

  var BIB_FILE = "papers.bib";
  var MAX_AUTHORS = 8; // longer author lists are shortened, with a button to show all

  /* Fields that only drive the website. They are left out of the BibTeX visitors copy. */
  var SITE_FIELDS = ["abbr", "pdf", "paper", "arxiv", "code", "website", "web", "demo", "dataset",
    "video", "slides", "poster", "supp", "html", "award", "preview", "selected", "bibtex_show"];

  var box = document.getElementById("pubs");
  var q = document.getElementById("pub-q");
  var count = document.getElementById("pub-count");
  var empty = document.getElementById("pub-empty");

  /* ----------------------------------------------------------------
     BibTeX parsing
  ---------------------------------------------------------------- */
  function readBraced(s, i) {
    var depth = 0;
    for (var j = i; j < s.length; j++) {
      if (s[j] === "{") depth++;
      else if (s[j] === "}") { depth--; if (depth === 0) return [s.slice(i + 1, j), j + 1]; }
    }
    throw new Error("unbalanced braces");
  }

  function parseBib(src) {
    var out = [];
    // Each entry starts on its own line with @type{ : read them one by one, so a
    // typo in one entry (a missing brace, say) only hides that entry.
    src.split(/\n(?=[ \t]*@[ \t]*[A-Za-z]+[ \t]*\{)/).forEach(function (chunk) {
      var m = /@\s*([A-Za-z]+)\s*\{/.exec(chunk);
      if (!m) return;
      var type = m[1].toLowerCase(), body;
      try {
        body = readBraced(chunk, m.index + m[0].length - 1)[0];
      } catch (err) {
        console.warn("papers.bib: skipped an entry with unbalanced braces:", chunk.slice(m.index, m.index + 80));
        return;
      }
      if (type === "comment" || type === "string" || type === "preamble") return;
      var comma = body.indexOf(",");
      var entry = { type: type, key: body.slice(0, comma).trim(), fields: {}, order: [] };
      var rest = body.slice(comma + 1), k = 0, fm;
      var fieldRe = /^(?:[\s,]+|%[^\n]*)*([A-Za-z_][\w\-]*)\s*=\s*/;
      try {
        while (k < rest.length && (fm = fieldRe.exec(rest.slice(k)))) {
          var name = fm[1].toLowerCase(), val;
          k += fm[0].length;
          if (rest[k] === "{") {
            var b = readBraced(rest, k); val = b[0]; k = b[1];
          } else if (rest[k] === '"') {
            var q2 = rest.indexOf('"', k + 1);
            if (q2 < 0) throw new Error("unclosed quote");
            val = rest.slice(k + 1, q2); k = q2 + 1;
          } else {
            var v = /^[^,}\s]+/.exec(rest.slice(k)); val = v ? v[0] : ""; k += val.length;
          }
          val = val.replace(/\s+/g, " ").trim();
          if (!(name in entry.fields)) entry.order.push(name);
          entry.fields[name] = val;
        }
      } catch (err) {
        console.warn("papers.bib: skipped a field in", entry.key);
      }
      if (entry.fields.title) out.push(entry);
    });
    return out;
  }

  /* LaTeX accents and commands to plain text */
  var MARKS = { "'": "́", "`": "̀", "^": "̂", "\"": "̈", "~": "̃", "=": "̄",
    ".": "̇", "u": "̆", "v": "̌", "H": "̋", "c": "̧", "k": "̨", "r": "̊" };
  var SYMBOLS = { "o": "ø", "O": "Ø", "ss": "ß", "ae": "æ", "AE": "Æ", "oe": "œ", "OE": "Œ",
    "aa": "å", "AA": "Å", "l": "ł", "L": "Ł", "i": "ı", "j": "ȷ" };

  function delatex(s) {
    if (!s) return "";
    s = s.replace(/\\([`'^"~=.])\s*\{?\s*\\?([A-Za-z])\s*\}?/g, function (_, a, l) { return l + MARKS[a]; });
    s = s.replace(/\\([uvHckr])(?:\s*\{\s*\\?([A-Za-z])\s*\}|\s+\\?([A-Za-z]))/g, function (_, a, l1, l2) { return (l1 || l2) + MARKS[a]; });
    s = s.replace(/\\(ss|ae|AE|oe|OE|aa|AA|o|O|l|L|i|j)(?![A-Za-z])\s?/g, function (_, c) { return SYMBOLS[c]; });
    s = s.replace(/\\(textit|textbf|emph|textrm|textsc|textsf|texttt|mathrm|mbox)\s*/g, "");
    s = s.replace(/\\([&%$#_])/g, "$1");
    s = s.replace(/([^\\])~/g, "$1 ");
    s = s.replace(/---/g, "—").replace(/--/g, "–");
    s = s.replace(/[{}]/g, "");
    return s.normalize ? s.normalize("NFC") : s;
  }

  function plain(s) {
    s = s.normalize ? s.normalize("NFD").replace(/[̀-ͯ]/g, "") : s;
    return s.toLowerCase();
  }

  function splitAuthors(raw) {
    var parts = [], depth = 0, start = 0;
    for (var i = 0; i < raw.length; i++) {
      var c = raw[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (depth === 0 && /\s/.test(c) && /^\s+and\s+/i.test(raw.slice(i))) {
        parts.push(raw.slice(start, i));
        i += /^\s+and\s+/i.exec(raw.slice(i))[0].length - 1;
        start = i + 1;
      }
    }
    parts.push(raw.slice(start));
    return parts.map(function (p) { return p.trim(); }).filter(Boolean).map(function (p) {
      var first, last;
      if (p.indexOf(",") >= 0) {
        var bits = p.split(",");
        last = bits[0];
        first = bits.slice(1).join(" ");
      } else {
        var t = p.split(/\s+/);
        last = t.pop();
        while (t.length > 1 && /^[a-z]/.test(t[t.length - 1])) last = t.pop() + " " + last; // von, de, van
        first = t.join(" ");
      }
      first = delatex(first).trim();
      last = delatex(last).trim();
      var l = plain(last).replace(/[^a-z]/g, "");
      var me = l === "vazquezcorral" || (l === "vazquez" && /^j/i.test(first));
      return { name: (first ? first + " " : "") + last, me: me };
    });
  }

  /* ----------------------------------------------------------------
     Rendering
  ---------------------------------------------------------------- */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") n.className = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) {
      if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  function url(v, base) {
    if (!v) return null;
    return /^[a-z]+:\/\//i.test(v) ? v : base + v;
  }

  function links(f) {
    var out = [];
    function add(label, href) {
      if (href && !out.some(function (x) { return x[1] === href; })) out.push([label, href]);
    }
    add("PDF", url(f.pdf, "assets/pdf/"));
    var doi = f.doi ? f.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "") : null;
    var paper = f.paper || f.html || (doi ? "https://doi.org/" + doi : f.url);
    if (paper) add(/scopus\.com/.test(paper) ? "Scopus" : "Paper", paper);
    add("arXiv", f.arxiv ? url(f.arxiv, "https://arxiv.org/abs/") : null);
    add("Code", f.code);
    add("Project page", f.website || f.web);
    add("Demo", f.demo);
    add("Dataset", f.dataset);
    add("Video", f.video);
    add("Slides", url(f.slides, "assets/pdf/"));
    add("Poster", url(f.poster, "assets/pdf/"));
    add("Supplementary", url(f.supp, "assets/pdf/"));
    return out;
  }

  function bibtex(e) {
    var names = e.order.filter(function (n) { return SITE_FIELDS.indexOf(n) < 0; });
    var w = Math.max.apply(null, names.map(function (n) { return n.length; }));
    var lines = names.map(function (n) {
      return "  " + n + new Array(w - n.length + 1).join(" ") + " = {" + e.fields[n] + "},";
    });
    return "@" + e.type + "{" + e.key + ",\n" + lines.join("\n") + "\n}";
  }

  function authorLine(list) {
    var p = el("p", { class: "authors" });
    var me = -1;
    list.forEach(function (a, i) { if (a.me && me < 0) me = i; });

    function fill(all) {
      p.textContent = "";
      var shown = all || list.length <= MAX_AUTHORS + 2 ? list.map(function (_, i) { return i; })
        : Array.apply(null, Array(MAX_AUTHORS)).map(function (_, i) { return i; });
      if (!all && shown.length < list.length && me >= MAX_AUTHORS) shown.push(me);
      shown.forEach(function (idx, j) {
        if (j) p.appendChild(document.createTextNode(j > 0 && idx - shown[j - 1] > 1 ? ", …, " : ", "));
        var a = list[idx];
        p.appendChild(a.me ? el("span", { class: "me", text: a.name }) : document.createTextNode(a.name));
      });
      if (shown.length < list.length) {
        p.appendChild(document.createTextNode(", "));
        var b = el("button", { type: "button", class: "more-authors",
          text: "and " + (list.length - shown.length) + " more" });
        b.addEventListener("click", function () { fill(true); });
        p.appendChild(b);
      }
    }
    fill(false);
    return p;
  }

  function render(entries) {
    var years = [];
    entries.forEach(function (e) {
      var y = parseInt(e.fields.year, 10) || 0;
      e.y = y;
      if (years.indexOf(y) < 0) years.push(y);
    });
    years.sort(function (a, b) { return b - a; });

    var items = [];
    years.forEach(function (y) {
      var list = el("ol", { class: "pub-list" });
      var group = el("section", { class: "year-group", "aria-label": y ? String(y) : "Undated" },
        [el("h3", { text: y ? String(y) : "Undated" }), list]);

      entries.filter(function (e) { return e.y === y; }).forEach(function (e) {
        var f = e.fields;
        var authors = splitAuthors(f.author || f.editor || "");
        var title = delatex(f.title);
        var venue = delatex(f.journal || f.booktitle || f.howpublished || f.publisher || f.school || "");
        var tag = delatex(f.abbr || "");

        var venueLine = el("p", { class: "venue" }, [
          venue ? el("em", { text: venue }) : null,
          venue && e.y ? ", " + e.y : (e.y ? String(e.y) : null),
          f.award ? el("span", { class: "award", text: ", " + delatex(f.award) }) : null
        ]);

        var actions = el("ul", { class: "actions" });
        links(f).forEach(function (l) {
          actions.appendChild(el("li", {}, [el("a", { href: l[1], text: l[0] })]));
        });

        var bibId = "bib-" + e.key.replace(/[^\w-]/g, "_");
        var bibBtn = el("button", { type: "button", "aria-expanded": "false", "aria-controls": bibId, text: "BibTeX" });
        actions.appendChild(el("li", {}, [bibBtn]));

        var body = el("div", { class: "pub-body" }, [
          el("p", { class: "title", text: title }),
          authors.length ? authorLine(authors) : null,
          venueLine,
          actions
        ]);

        var panel = null;
        bibBtn.addEventListener("click", function () {
          var open = bibBtn.getAttribute("aria-expanded") === "true";
          if (!panel) {
            var text = bibtex(e);
            var copy = el("button", { type: "button", class: "copy", text: "Copy" });
            copy.addEventListener("click", function () {
              var done = function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy"; }, 1600); };
              if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
            });
            panel = el("div", { class: "bibtex", id: bibId }, [el("pre", { text: text }), copy]);
            body.appendChild(panel);
          }
          panel.hidden = open;
          bibBtn.setAttribute("aria-expanded", open ? "false" : "true");
        });

        var li = el("li", { class: "pub", id: e.key }, [el("span", { class: "tag", text: tag }), body]);
        list.appendChild(li);
        items.push({
          li: li,
          group: group,
          hay: plain([title, authors.map(function (a) { return a.name; }).join(" "), venue, tag, e.y].join(" "))
        });
      });
      box.appendChild(group);
    });

    function filter() {
      var words = plain(q.value).split(/\s+/).filter(Boolean);
      var n = 0;
      items.forEach(function (it) {
        var ok = words.every(function (w) { return it.hay.indexOf(w) >= 0; });
        it.li.hidden = !ok;
        if (ok) n++;
      });
      [].forEach.call(box.children, function (g) {
        g.hidden = !g.querySelector(".pub:not([hidden])");
      });
      count.textContent = words.length ? n + " of " + items.length + " papers" : items.length + " papers";
      empty.hidden = n > 0;
    }
    q.addEventListener("input", filter);
    document.getElementById("pub-clear").addEventListener("click", function () { q.value = ""; filter(); q.focus(); });
    filter();

    // The list loads after the browser has jumped to #publications, #cv or #paper-key,
    // and pushes the sections below it down: jump again once it is in place (and once
    // more when the web font has loaded, since that changes line heights).
    if (location.hash.length > 1) {
      var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) {
        var jump = function () { target.scrollIntoView({ behavior: "instant", block: "start" }); };
        jump();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(jump);
      }
    }
  }

  fetch(BIB_FILE)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (t) { render(parseBib(t)); })
    .catch(function () {
      box.appendChild(el("p", {}, [
        "The publication list could not be loaded. All papers are on ",
        el("a", { href: "https://scholar.google.com/citations?user=gjnuPMoAAAA", text: "Google Scholar" }), "."
      ]));
    });
})();
