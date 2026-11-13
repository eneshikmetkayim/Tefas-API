(function () {
  "use strict";

  const data = window.TEFAS_DOCS;
  const STORAGE_LANG_KEY = "tefas_docs_lang";
  const STORAGE_THEME_KEY = "tefas_docs_theme";

  let activeLang = localStorage.getItem(STORAGE_LANG_KEY) || "python";
  if (!data.languages.some((l) => l.id === activeLang)) {
    activeLang = "python";
  }

  let activeTheme = localStorage.getItem(STORAGE_THEME_KEY) || "dark";
  document.documentElement.setAttribute("data-theme", activeTheme);

  const tabWidgets = [];

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function codeEl(text) {
    return el("code", "", text);
  }

  function createCopyButton(getText) {
    const btn = el("button", "copy-btn", "Kopyala");
    btn.type = "button";
    btn.addEventListener("click", async () => {
      const value = getText();
      try {
        await navigator.clipboard.writeText(value);
        btn.textContent = "Kopyalandı ✓";
        setTimeout(() => {
          btn.textContent = "Kopyala";
        }, 1500);
      } catch (err) {
        console.warn("Clipboard write failed:", err);
        btn.textContent = "Hata";
      }
    });
    return btn;
  }

  function createCodeTabsWidget(codeByLang) {
    const wrap = el("div", "code-tabs");
    const header = el("div", "code-tab-header");
    const tabList = el("div", "tab-list");
    const pre = el("pre");
    const code = el("code");
    pre.appendChild(code);

    const buttons = {};
    data.languages.forEach((lang) => {
      const btn = el("button", "tab-btn", lang.label);
      btn.type = "button";
      btn.dataset.lang = lang.id;
      btn.addEventListener("click", () => setGlobalLanguage(lang.id));
      buttons[lang.id] = btn;
      tabList.appendChild(btn);
    });

    const copyBtn = createCopyButton(() => codeByLang[activeLang] || "");
    header.appendChild(tabList);
    header.appendChild(copyBtn);
    wrap.appendChild(header);
    wrap.appendChild(pre);

    function sync(langId) {
      code.textContent = codeByLang[langId] || "";
      Object.entries(buttons).forEach(([id, btn]) => {
        btn.classList.toggle("active", id === langId);
      });
    }

    tabWidgets.push(sync);
    sync(activeLang);
    return wrap;
  }

  function setGlobalLanguage(langId) {
    activeLang = langId;
    localStorage.setItem(STORAGE_LANG_KEY, langId);

    document.querySelectorAll("#global-lang-bar .lang-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === langId);
    });
    tabWidgets.forEach((syncFn) => syncFn(langId));
  }

  function renderGlobalLangBar() {
    const bar = document.getElementById("global-lang-bar");
    data.languages.forEach((lang) => {
      const btn = el("button", "lang-btn", lang.label);
      btn.type = "button";
      btn.dataset.lang = lang.id;
      btn.classList.toggle("active", lang.id === activeLang);
      btn.addEventListener("click", () => setGlobalLanguage(lang.id));
      bar.appendChild(btn);
    });
  }

  function renderHeroStats() {
    const host = document.getElementById("hero-stats");
    data.stats.forEach((item) => {
      const box = el("div", "stat-box");
      box.appendChild(el("span", "stat-val", item.value));
      box.appendChild(el("span", "stat-label", item.label));
      host.appendChild(box);
    });
  }

  function renderArchitecture() {
    const grid = document.getElementById("architecture-grid");
    data.architecture.forEach((item) => {
      const card = el("article", "feature-card");
      const title = el("h3");
      title.appendChild(document.createTextNode(item.title + " "));
      title.appendChild(el("span", "pill pill-accent", item.badge));
      card.appendChild(title);
      card.appendChild(el("p", "", item.text));
      grid.appendChild(card);
    });
  }

  function renderQuickstart() {
    const host = document.getElementById("quickstart-container");
    host.appendChild(createCodeTabsWidget(data.quickstart));
  }

  function renderFundTypes() {
    const host = document.getElementById("fund-types-container");
    const wrap = el("div", "table-wrap");
    const table = el("table");
    const thead = el("thead");
    const htr = el("tr");
    ["Kod", "Açıklama", "Önemli Teknik Not"].forEach((label) => htr.appendChild(el("th", "", label)));
    thead.appendChild(htr);

    const tbody = el("tbody");
    data.fundTypes.forEach((ft) => {
      const tr = el("tr");
      const tdCode = el("td");
      tdCode.appendChild(codeEl(ft.code));
      tr.appendChild(tdCode);
      tr.appendChild(el("td", "", ft.tr));
      tr.appendChild(el("td", "", ft.notes));
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    wrap.appendChild(table);
    host.appendChild(wrap);
  }

  function renderMatrix() {
    const host = document.getElementById("matrix-container");
    const table = el("table");
    const thead = el("thead");
    const htr = el("tr");
    ["#", "Metot", "TEFAS Endpoint", "Python / Rust", "JS / Java", "Go / C#"].forEach((col) =>
      htr.appendChild(el("th", "", col))
    );
    thead.appendChild(htr);

    const tbody = el("tbody");
    const allMethods = [...data.coreMethods, ...data.extendedMethods];
    allMethods.forEach((m, idx) => {
      const tr = el("tr");
      tr.appendChild(el("td", "", String(idx + 1)));

      const nameTd = el("td");
      const link = el("a", "", m.name.split(" — ")[0]);
      link.href = `#${m.id}`;
      nameTd.appendChild(link);
      tr.appendChild(nameTd);

      const epTd = el("td");
      epTd.appendChild(codeEl(m.endpoint.replace("POST ", "")));
      tr.appendChild(epTd);

      const pyRustTd = el("td");
      pyRustTd.appendChild(codeEl(m.signatures.python.split("(")[0]));
      tr.appendChild(pyRustTd);

      const jsJavaTd = el("td");
      jsJavaTd.appendChild(codeEl(m.signatures.javascript.split("(")[0]));
      tr.appendChild(jsJavaTd);

      const goCsTd = el("td");
      goCsTd.appendChild(codeEl(m.signatures.go.split("(")[0]));
      goCsTd.appendChild(document.createTextNode(" / "));
      goCsTd.appendChild(codeEl(m.signatures.dotnet.split("(")[0]));
      tr.appendChild(goCsTd);

      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    host.appendChild(table);
  }

  function buildMethodCard(method) {
    const card = el("article", "endpoint-card searchable");
    card.id = method.id;
    card.dataset.search = [
      method.name,
      method.endpoint,
      method.description,
      method.returns,
      ...Object.values(method.signatures)
    ]
      .join(" ")
      .toLowerCase();

    const head = el("div", "endpoint-head");
    const titleRow = el("div", "endpoint-title-row");
    titleRow.appendChild(el("span", "pill pill-purple", method.badge));
    titleRow.appendChild(el("h3", "", method.name));
    head.appendChild(titleRow);
    head.appendChild(el("span", "http-badge", method.endpoint));

    const body = el("div", "endpoint-body");
    body.appendChild(el("p", "endpoint-desc", method.description));

    const sigStrip = el("div", "sig-strip");
    data.languages.forEach((lang) => {
      const item = el("div", "sig-item");
      item.appendChild(el("span", "sig-lang", lang.label));
      item.appendChild(codeEl(method.signatures[lang.id]));
      sigStrip.appendChild(item);
    });
    body.appendChild(sigStrip);

    const detailGrid = el("div", "detail-grid");
    const paramPanel = el("div", "mini-panel");
    paramPanel.appendChild(el("h4", "", "Parametreler"));
    method.params.forEach((p) => {
      const row = el("div");
      row.appendChild(codeEl(p.name));
      row.appendChild(document.createTextNode(` (${p.type}) — ${p.desc}`));
      paramPanel.appendChild(row);
    });
    detailGrid.appendChild(paramPanel);

    const retPanel = el("div", "mini-panel");
    retPanel.appendChild(el("h4", "", "Dönüş Şeması"));
    retPanel.appendChild(el("div", "", method.returns));
    detailGrid.appendChild(retPanel);
    body.appendChild(detailGrid);

    body.appendChild(createCodeTabsWidget(method.code));

    const jsonDetails = el("details", "json-disclosure");
    jsonDetails.appendChild(el("summary", "", "Ham TEFAS İstek ve Doğrulanmış Yanıt Örneği (JSON)"));
    const jsonPre = el("pre");
    jsonPre.appendChild(
      codeEl(
        "// İstek (Request):\n" +
          JSON.stringify(method.sampleRequest, null, 2) +
          "\n\n// Örnek Yanıt (Response):\n" +
          JSON.stringify(method.sampleResponse, null, 2)
      )
    );
    jsonDetails.appendChild(jsonPre);
    body.appendChild(jsonDetails);

    card.appendChild(head);
    card.appendChild(body);
    return card;
  }

  function renderMethods() {
    const coreHost = document.getElementById("core-methods-container");
    data.coreMethods.forEach((m) => coreHost.appendChild(buildMethodCard(m)));

    const extHost = document.getElementById("extended-methods-container");
    data.extendedMethods.forEach((m) => extHost.appendChild(buildMethodCard(m)));
  }

  function renderHttpReference() {
    const host = document.getElementById("http-reference-container");
    data.httpEndpoints.forEach((ep, idx) => {
      const card = el("article", "endpoint-card searchable");
      card.id = `http-${idx + 1}`;
      card.dataset.search = `${ep.path} ${ep.usedBy} ${ep.body} ${ep.notes}`.toLowerCase();

      const head = el("div", "endpoint-head");
      const titleRow = el("div", "endpoint-title-row");
      titleRow.appendChild(el("span", "pill pill-amber", `Endpoint #${idx + 1}`));
      titleRow.appendChild(el("h3", "", ep.path));
      head.appendChild(titleRow);
      head.appendChild(el("span", "http-badge", "POST JSON"));

      const body = el("div", "endpoint-body");
      const usedP = el("p", "endpoint-desc");
      usedP.appendChild(document.createTextNode("Kullanan metotlar: "));
      usedP.appendChild(codeEl(ep.usedBy));
      usedP.appendChild(document.createTextNode(" — " + ep.notes));
      body.appendChild(usedP);

      const curlText =
        `curl -sS -X POST "https://www.tefas.gov.tr${ep.path}" \\\n` +
        `  -H "Content-Type: application/json" \\\n` +
        `  -H "Accept: application/json" \\\n` +
        `  -H "Origin: https://www.tefas.gov.tr" \\\n` +
        `  -H "Referer: https://www.tefas.gov.tr/tr/fon-karsilastirma" \\\n` +
        `  -d '${ep.body}'`;

      const tabs = el("div", "code-tabs");
      const bar = el("div", "code-tab-header");
      bar.appendChild(el("span", "pill", "cURL"));
      bar.appendChild(createCopyButton(() => curlText));
      const pre = el("pre");
      pre.appendChild(codeEl(curlText));
      tabs.appendChild(bar);
      tabs.appendChild(pre);
      body.appendChild(tabs);

      card.appendChild(head);
      card.appendChild(body);
      host.appendChild(card);
    });
  }

  function renderModelsAndErrors() {
    const host = document.getElementById("models-errors-container");

    const allocTitle = el("h3", "", "Varlık Dağılımı Alan Eşlemesi (22 TEFAS Kodu -> 12 Grup)");
    host.appendChild(allocTitle);

    const allocWrap = el("div", "table-wrap");
    const allocTable = el("table");
    const ah = el("thead");
    const ahr = el("tr");
    ["Model Alanı", "Ham TEFAS Anahtarları", "Açıklama"].forEach((t) => ahr.appendChild(el("th", "", t)));
    ah.appendChild(ahr);
    const ab = el("tbody");
    data.allocationFields.forEach((f) => {
      const tr = el("tr");
      const c1 = el("td");
      c1.appendChild(codeEl(f.modelField));
      const c2 = el("td");
      c2.appendChild(codeEl(f.rawKeys));
      tr.appendChild(c1);
      tr.appendChild(c2);
      tr.appendChild(el("td", "", f.desc));
      ab.appendChild(tr);
    });
    allocTable.appendChild(ah);
    allocTable.appendChild(ab);
    allocWrap.appendChild(allocTable);
    host.appendChild(allocWrap);

    const syncCard = el("div", "feature-card");
    syncCard.style.marginTop = "18px";
    syncCard.appendChild(el("h3", "", "Python Senkron (sync_*) Arayüzü"));
    syncCard.appendChild(
      el(
        "p",
        "",
        "Event loop kullanmayan Python script'leri için client." +
          data.pythonSyncMethods.join("(), client.") +
          "() metotları mevcuttur."
      )
    );
    host.appendChild(syncCard);

    const errTitle = el("h3", "", "Dillere Göre Hata Yönetimi");
    errTitle.style.marginTop = "20px";
    host.appendChild(errTitle);

    const errWrap = el("div", "table-wrap");
    const errTable = el("table");
    const eh = el("thead");
    const ehr = el("tr");
    ["Dil", "Hata / İstisna Modeli"].forEach((t) => ehr.appendChild(el("th", "", t)));
    eh.appendChild(ehr);
    const eb = el("tbody");
    data.errorModels.forEach((em) => {
      const tr = el("tr");
      tr.appendChild(el("td", "", em.lang));
      const d = el("td");
      d.appendChild(codeEl(em.details));
      tr.appendChild(d);
      eb.appendChild(tr);
    });
    errTable.appendChild(eh);
    errTable.appendChild(eb);
    errWrap.appendChild(errTable);
    host.appendChild(errWrap);
  }

  function renderSidebar() {
    const nav = document.getElementById("sidebar-nav");
    const groups = [
      {
        title: "Başlangıç",
        items: [
          { href: "#overview", label: "Genel Bakış" },
          { href: "#architecture", label: "Pure-HTTP Mimari" },
          { href: "#quickstart", label: "Kurulum & Hızlı Başlangıç" },
          { href: "#fund-types", label: "Fon Piyasaları (5 Tip)" },
          { href: "#method-matrix", label: "19 Metot Matrisi" }
        ]
      },
      {
        title: "7 Ana Metod",
        items: data.coreMethods.map((m) => ({
          href: `#${m.id}`,
          label: m.name.split(" — ")[0],
          tag: "Ana"
        }))
      },
      {
        title: "12 Ek Endpoint",
        items: data.extendedMethods.map((m) => ({
          href: `#${m.id}`,
          label: m.name.split(" — ")[0],
          tag: m.endpoint.split("/").pop()
        }))
      },
      {
        title: "Referans",
        items: [
          { href: "#http-reference", label: "Ham HTTP & cURL (13)" },
          { href: "#models-errors", label: "Modeller, sync_* & Hatalar" }
        ]
      }
    ];

    groups.forEach((g) => {
      const wrap = el("div", "nav-group");
      wrap.appendChild(el("div", "nav-group-title", g.title));
      g.items.forEach((item) => {
        const a = el("a", "nav-link", item.label);
        a.href = item.href;
        if (item.tag) a.appendChild(el("span", "nav-tag", item.tag));
        a.addEventListener("click", () => {
          document.getElementById("sidebar").classList.remove("open");
        });
        wrap.appendChild(a);
      });
      nav.appendChild(wrap);
    });
  }

  function wireControls() {
    const searchInput = document.getElementById("search-input");
    const searchCount = document.getElementById("search-count");

    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim().toLowerCase();
      const cards = document.querySelectorAll(".searchable");
      let shown = 0;
      cards.forEach((card) => {
        const match = !q || (card.dataset.search || "").includes(q);
        card.classList.toggle("is-hidden", !match);
        if (match) shown += 1;
      });
      searchCount.hidden = !q;
      searchCount.textContent = q ? `${shown} sonuç` : "";
    });

    document.addEventListener("keydown", (ev) => {
      if ((ev.key === "/" || ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k")) &&
          document.activeElement !== searchInput) {
        ev.preventDefault();
        searchInput.focus();
      }
    });

    const themeBtn = document.getElementById("theme-toggle");
    function updateThemeIcon() {
      themeBtn.textContent = activeTheme === "dark" ? "☀️" : "🌙";
    }
    updateThemeIcon();

    themeBtn.addEventListener("click", () => {
      activeTheme = activeTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", activeTheme);
      localStorage.setItem(STORAGE_THEME_KEY, activeTheme);
      updateThemeIcon();
    });

    const menuBtn = document.getElementById("menu-toggle");
    const sidebar = document.getElementById("sidebar");
    menuBtn.addEventListener("click", () => sidebar.classList.toggle("open"));
  }

  renderGlobalLangBar();
  renderHeroStats();
  renderArchitecture();
  renderQuickstart();
  renderFundTypes();
  renderMatrix();
  renderMethods();
  renderHttpReference();
  renderModelsAndErrors();
  renderSidebar();
  wireControls();
})();
