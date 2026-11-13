(function () {
  "use strict";

  const data = window.TEFAS_DOCS;
  const STORAGE_LANG_KEY = "tefas_docs_lang";
  const STORAGE_THEME_KEY = "tefas_docs_theme";
  const STORAGE_PROXY_KEY = "tefas_docs_proxy_url";

  const ALLOWED_ENDPOINT_PATHS = new Map(data.httpEndpoints.map((ep) => [ep.path, ep.path]));
  const ENDPOINT_BY_PATH = new Map(data.httpEndpoints.map((ep) => [ep.path, ep]));
  const DEFAULT_LOCAL_PROXY = "http://127.0.0.1:8787";

  const isLocalHost =
    window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";

  let activeLang = localStorage.getItem(STORAGE_LANG_KEY) || "python";
  if (!data.languages.some((l) => l.id === activeLang)) {
    activeLang = "python";
  }

  let activeTheme = localStorage.getItem(STORAGE_THEME_KEY) || "light";
  if (activeTheme !== "light" && activeTheme !== "dark") {
    activeTheme = "light";
  }
  document.documentElement.setAttribute("data-theme", activeTheme);

  const tabWidgets = [];
  const methodItemsById = new Map();
  let playgroundController = null;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function codeEl(text) {
    return el("code", "", text);
  }

  async function copyToClipboard(text, btn, defaultLabel) {
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Kopyalandı";
      setTimeout(() => {
        btn.textContent = defaultLabel;
      }, 1500);
    } catch (err) {
      console.warn("Clipboard write failed:", err);
      btn.textContent = "Kopyalanamadı";
      setTimeout(() => {
        btn.textContent = defaultLabel;
      }, 1500);
    }
  }

  function createCopyButton(getText, label) {
    const btnLabel = label || "Kopyala";
    const btn = el("button", "copy-btn", btnLabel);
    btn.type = "button";
    btn.addEventListener("click", () => copyToClipboard(getText(), btn, btnLabel));
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
    if (playgroundController) {
      playgroundController.refreshGeneratedCode();
    }
  }

  function formatTradingYyyymmdd(offsetDays) {
    const dt = new Date();
    dt.setDate(dt.getDate() + (offsetDays || 0));
    while (dt.getDay() === 0 || dt.getDay() === 6) {
      dt.setDate(dt.getDate() - 1);
    }
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  }

  function renderGlobalLangBar() {
    const bar = document.getElementById("global-lang-bar");
    data.languages.forEach((lang) => {
      const btn = el("button", "lang-btn", lang.shortLabel || lang.label);
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
      const head = el("div", "feature-card-head");
      head.appendChild(el("h3", "", item.title));
      head.appendChild(el("span", "badge badge-secondary", item.badge));
      card.appendChild(head);
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
    const wrap = el("div", "table-card");
    const table = el("table");
    const thead = el("thead");
    const htr = el("tr");
    ["Kod", "Açıklama", "Teknik Not"].forEach((label) => htr.appendChild(el("th", "", label)));
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

  function openMethodById(methodId) {
    const entry = methodItemsById.get(methodId);
    if (!entry) return;
    entry.details.classList.remove("is-hidden");
    entry.details.open = true;
    entry.mountBody();
    entry.details.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderMatrix() {
    const host = document.getElementById("matrix-container");
    const table = el("table");
    const thead = el("thead");
    const htr = el("tr");
    ["#", "Metot", "TEFAS Endpoint", "Python", "TS / JS", "Go / C#"].forEach((col) =>
      htr.appendChild(el("th", "", col))
    );
    thead.appendChild(htr);

    const tbody = el("tbody");
    const allRows = [
      ...data.coreMethods.map((m) => ({ method: m, category: "core" })),
      ...data.extendedMethods.map((m) => ({ method: m, category: "extended" }))
    ];

    allRows.forEach(({ method, category }, idx) => {
      const tr = el("tr", "matrix-row");
      tr.dataset.category = category;
      tr.addEventListener("click", () => openMethodById(method.id));

      tr.appendChild(el("td", "", String(idx + 1)));

      const nameTd = el("td");
      const link = el("a", "", method.name.split(" — ")[0]);
      link.href = `#${method.id}`;
      link.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        openMethodById(method.id);
      });
      nameTd.appendChild(link);
      tr.appendChild(nameTd);

      const epTd = el("td");
      epTd.appendChild(codeEl(method.endpoint.replace("POST ", "")));
      tr.appendChild(epTd);

      const pyTd = el("td");
      pyTd.appendChild(codeEl(method.signatures.python.split("(")[0]));
      tr.appendChild(pyTd);

      const jsTd = el("td");
      jsTd.appendChild(codeEl(method.signatures.javascript.split("(")[0]));
      tr.appendChild(jsTd);

      const goCsTd = el("td");
      goCsTd.appendChild(codeEl(method.signatures.go.split("(")[0]));
      goCsTd.appendChild(document.createTextNode(" / "));
      goCsTd.appendChild(codeEl(method.signatures.dotnet.split("(")[0]));
      tr.appendChild(goCsTd);

      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    host.appendChild(table);

    document.querySelectorAll("#matrix-filter-tabs .tab-trigger").forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = btn.dataset.matrixFilter;
        document.querySelectorAll("#matrix-filter-tabs .tab-trigger").forEach((b) => {
          b.classList.toggle("active", b === btn);
        });
        tbody.querySelectorAll("tr").forEach((row) => {
          const show = filter === "all" || row.dataset.category === filter;
          row.hidden = !show;
        });
      });
    });
  }

  function buildMethodAccordion(method, openByDefault) {
    const details = el("details", "acc-item");
    details.id = method.id;
    details.dataset.search = [
      method.name,
      method.endpoint,
      method.description,
      method.returns,
      ...Object.values(method.signatures)
    ]
      .join(" ")
      .toLowerCase();

    const summary = el("summary", "acc-summary");
    const left = el("div", "acc-title-wrap");
    left.appendChild(el("span", "badge badge-secondary", method.badge));
    const parts = method.name.split(" — ");
    left.appendChild(el("span", "acc-title", parts[0]));
    if (parts[1]) {
      left.appendChild(el("span", "acc-sub", parts[1]));
    }

    const right = el("div", "acc-meta");
    right.appendChild(el("span", "endpoint-mono", method.endpoint));
    summary.appendChild(left);
    summary.appendChild(right);
    details.appendChild(summary);

    const bodyHost = el("div", "acc-body");
    bodyHost.hidden = true;

    let mounted = false;
    function mountBody() {
      bodyHost.hidden = false;
      if (mounted) return;
      mounted = true;

      const topRow = el("div", "acc-body-top");
      topRow.appendChild(el("p", "endpoint-desc", method.description));

      const epPath = method.endpoint.replace("POST ", "");
      if (ENDPOINT_BY_PATH.has(epPath)) {
        const tryBtn = el("button", "btn btn-outline btn-xs", "Playground'da Dene");
        tryBtn.type = "button";
        tryBtn.addEventListener("click", () => {
          if (playgroundController) {
            const safeOverrides = {};
            ["fonTipi", "fonKodu", "fonKod", "periyod", "aramaMetni", "dil"].forEach((k) => {
              if (method.sampleRequest && Object.prototype.hasOwnProperty.call(method.sampleRequest, k)) {
                safeOverrides[k] = method.sampleRequest[k];
              }
            });
            playgroundController.loadEndpoint(epPath, safeOverrides);
          }
        });
        topRow.appendChild(tryBtn);
      }
      bodyHost.appendChild(topRow);

      const sigStrip = el("div", "sig-strip");
      data.languages.forEach((lang) => {
        const item = el("div", "sig-item");
        item.appendChild(el("span", "sig-lang", lang.label));
        item.appendChild(codeEl(method.signatures[lang.id]));
        sigStrip.appendChild(item);
      });
      bodyHost.appendChild(sigStrip);

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
      bodyHost.appendChild(detailGrid);

      bodyHost.appendChild(createCodeTabsWidget(method.code));

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
      bodyHost.appendChild(jsonDetails);
    }

    details.addEventListener("toggle", () => {
      if (details.open) {
        mountBody();
      } else {
        bodyHost.hidden = true;
      }
    });

    details.appendChild(bodyHost);
    if (openByDefault) {
      details.open = true;
      mountBody();
    }

    methodItemsById.set(method.id, { details, mountBody });
    return details;
  }

  function renderMethods() {
    const coreHost = document.getElementById("core-methods-container");
    data.coreMethods.forEach((m, idx) => coreHost.appendChild(buildMethodAccordion(m, idx === 0)));

    const extHost = document.getElementById("extended-methods-container");
    data.extendedMethods.forEach((m) => extHost.appendChild(buildMethodAccordion(m, false)));

    document.getElementById("expand-all-btn").addEventListener("click", () => {
      methodItemsById.forEach(({ details, mountBody }) => {
        if (!details.classList.contains("is-hidden")) {
          details.open = true;
          mountBody();
        }
      });
    });

    document.getElementById("collapse-all-btn").addEventListener("click", () => {
      methodItemsById.forEach(({ details }) => {
        details.open = false;
      });
    });

    const filterInput = document.getElementById("method-filter-input");
    filterInput.addEventListener("input", () => {
      const q = filterInput.value.trim().toLowerCase();
      methodItemsById.forEach(({ details }) => {
        const match = !q || (details.dataset.search || "").includes(q);
        details.classList.toggle("is-hidden", !match);
      });
    });
  }

  function buildCurlCommand(path, bodyStr) {
    return (
      `curl -sS -X POST "https://www.tefas.gov.tr${path}" \\\n` +
      `  -H "Content-Type: application/json" \\\n` +
      `  -H "Accept: application/json" \\\n` +
      `  -H "Origin: https://www.tefas.gov.tr" \\\n` +
      `  -H "Referer: https://www.tefas.gov.tr/tr/fon-karsilastirma" \\\n` +
      `  -d '${bodyStr}'`
    );
  }

  function renderHttpReference() {
    const host = document.getElementById("http-reference-container");
    data.httpEndpoints.forEach((ep, idx) => {
      const details = el("details", "acc-item");
      details.id = `http-${idx + 1}`;

      const summary = el("summary", "acc-summary");
      const left = el("div", "acc-title-wrap");
      left.appendChild(el("span", "badge badge-outline", `#${idx + 1} POST`));
      left.appendChild(el("span", "acc-title endpoint-mono", ep.path));
      left.appendChild(el("span", "acc-sub", ep.title || ""));

      const right = el("div", "acc-meta");
      right.appendChild(el("span", "badge badge-secondary", ep.group || "TEFAS"));
      summary.appendChild(left);
      summary.appendChild(right);
      details.appendChild(summary);

      const body = el("div", "acc-body");
      const top = el("div", "acc-body-top");
      const desc = el("p", "endpoint-desc");
      desc.appendChild(document.createTextNode("Kullanan metotlar: "));
      desc.appendChild(codeEl(ep.usedBy));
      desc.appendChild(document.createTextNode(" — " + ep.notes));
      top.appendChild(desc);

      const tryBtn = el("button", "btn btn-outline btn-xs", "Playground'da Aç");
      tryBtn.type = "button";
      tryBtn.addEventListener("click", () => {
        if (playgroundController) {
          playgroundController.loadEndpoint(ep.path);
        }
      });
      top.appendChild(tryBtn);
      body.appendChild(top);

      const curlText = buildCurlCommand(ep.path, ep.body);
      const codeBox = el("div", "code-tabs");
      const bar = el("div", "code-tab-header");
      bar.appendChild(el("span", "tab-btn active", "cURL"));
      bar.appendChild(createCopyButton(() => curlText));
      const pre = el("pre");
      pre.appendChild(codeEl(curlText));
      codeBox.appendChild(bar);
      codeBox.appendChild(pre);
      body.appendChild(codeBox);

      details.appendChild(body);
      host.appendChild(details);
    });
  }

  function renderModelsAndErrors() {
    const host = document.getElementById("models-errors-container");
    const tabsBar = el("div", "tabs-bar");
    const panels = {};

    const tabDefs = [
      { id: "alloc", label: "Varlık Dağılımı (22 -> 12)" },
      { id: "sync", label: "Python sync_* (20 Metot)" },
      { id: "errors", label: "Hata Modelleri (6 Dil)" }
    ];

    const allocWrap = el("div", "table-card");
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
    panels.alloc = allocWrap;

    const syncCard = el("div", "feature-card");
    syncCard.hidden = true;
    const syncHead = el("div", "feature-card-head");
    syncHead.appendChild(el("h3", "", "Python Senkron (sync_*) Sarmalayıcıları"));
    syncHead.appendChild(el("span", "badge badge-secondary", `${data.pythonSyncMethods.length} Metot`));
    syncCard.appendChild(syncHead);
    syncCard.appendChild(
      el(
        "p",
        "",
        "Asenkron event loop kullanmayan script ve notebook ortamları için her async metodun senkron karşılığı mevcuttur:"
      )
    );
    const syncCode = el("pre", "code-pre");
    syncCode.style.marginTop = "12px";
    syncCode.style.borderRadius = "6px";
    syncCode.appendChild(codeEl(data.pythonSyncMethods.map((m) => `client.${m}(...)`).join("\n")));
    syncCard.appendChild(syncCode);
    panels.sync = syncCard;

    const errWrap = el("div", "table-card");
    errWrap.hidden = true;
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
    panels.errors = errWrap;

    const tabButtons = {};
    function selectModelTab(id) {
      Object.entries(panels).forEach(([key, node]) => {
        node.hidden = key !== id;
      });
      Object.entries(tabButtons).forEach(([key, btn]) => {
        btn.classList.toggle("active", key === id);
      });
    }

    tabDefs.forEach((def, idx) => {
      const btn = el("button", idx === 0 ? "tab-trigger active" : "tab-trigger", def.label);
      btn.type = "button";
      btn.addEventListener("click", () => selectModelTab(def.id));
      tabButtons[def.id] = btn;
      tabsBar.appendChild(btn);
    });

    host.appendChild(tabsBar);
    host.appendChild(panels.alloc);
    host.appendChild(panels.sync);
    host.appendChild(panels.errors);
  }

  function renderSidebar() {
    const nav = document.getElementById("sidebar-nav");
    const groups = [
      {
        title: "Başlangıç",
        items: [
          { href: "#overview", label: "Genel Bakış" },
          { href: "#playground", label: "API Playground", tag: "Canlı" },
          { href: "#architecture", label: "Pure-HTTP Mimari" },
          { href: "#quickstart", label: "Kurulum" },
          { href: "#fund-types", label: "Fon Piyasaları" },
          { href: "#method-matrix", label: "19 Metot Matrisi" }
        ]
      },
      {
        title: "7 Ana Metod",
        items: data.coreMethods.map((m) => ({
          href: `#${m.id}`,
          label: m.name.split(" — ")[0],
          methodId: m.id
        }))
      },
      {
        title: "12 Ek Endpoint",
        items: data.extendedMethods.map((m) => ({
          href: `#${m.id}`,
          label: m.name.split(" — ")[0],
          methodId: m.id
        }))
      },
      {
        title: "Referans",
        items: [
          { href: "#http-reference", label: "Ham HTTP & cURL" },
          { href: "#models-errors", label: "Modeller & Hatalar" }
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
        a.addEventListener("click", (ev) => {
          document.getElementById("sidebar").classList.remove("open");
          if (item.methodId) {
            ev.preventDefault();
            openMethodById(item.methodId);
          }
        });
        wrap.appendChild(a);
      });
      nav.appendChild(wrap);
    });
  }

  function initCommandPalette() {
    const dialog = document.getElementById("cmd-dialog");
    const input = document.getElementById("cmd-input");
    const resultsHost = document.getElementById("cmd-results");
    const triggerBtn = document.getElementById("cmd-trigger");
    const closeBtn = document.getElementById("cmd-close-btn");

    const items = [
      { title: "API Playground", sub: "Canlı TEFAS isteği ve şema deneme alanı", group: "Bölüm", action: () => location.assign("#playground") },
      { title: "Kurulum & Hızlı Başlangıç", sub: "6 dil kurulum komutları", group: "Bölüm", action: () => location.assign("#quickstart") },
      { title: "Fon Piyasaları (FundType)", sub: "YAT, EMK, BYF, GYF, GSYF", group: "Bölüm", action: () => location.assign("#fund-types") },
      { title: "19 Metot Matrisi", sub: "Tüm diller karşılaştırma tablosu", group: "Bölüm", action: () => location.assign("#method-matrix") },
      { title: "Veri Modelleri & Hatalar", sub: "Varlık dağılımı, sync_*, istisnalar", group: "Bölüm", action: () => location.assign("#models-errors") },
      ...[...data.coreMethods, ...data.extendedMethods].map((m) => ({
        title: m.name,
        sub: m.endpoint,
        group: m.badge,
        searchText: `${m.name} ${m.endpoint} ${m.description} ${Object.values(m.signatures).join(" ")}`.toLowerCase(),
        action: () => openMethodById(m.id)
      })),
      ...data.httpEndpoints.map((ep, idx) => ({
        title: `POST ${ep.path}`,
        sub: `${ep.title} (${ep.usedBy})`,
        group: "Playground",
        searchText: `${ep.path} ${ep.title} ${ep.usedBy} ${ep.notes}`.toLowerCase(),
        action: () => {
          if (playgroundController) {
            playgroundController.loadEndpoint(ep.path);
          } else {
            location.assign(`#http-${idx + 1}`);
          }
        }
      }))
    ];

    let activeIndex = 0;
    let visibleItems = [];

    function renderList() {
      const q = input.value.trim().toLowerCase();
      visibleItems = items
        .filter((it) => {
          if (!q) return true;
          const hay = it.searchText || `${it.title} ${it.sub} ${it.group}`.toLowerCase();
          return hay.includes(q);
        })
        .slice(0, 14);

      if (activeIndex >= visibleItems.length) {
        activeIndex = 0;
      }

      resultsHost.replaceChildren();
      if (visibleItems.length === 0) {
        resultsHost.appendChild(el("div", "empty-cell", "Eşleşen sonuç bulunamadı."));
        return;
      }

      visibleItems.forEach((it, idx) => {
        const btn = el("button", idx === activeIndex ? "cmd-item active" : "cmd-item");
        btn.type = "button";
        const left = el("div");
        left.appendChild(el("div", "", it.title));
        left.appendChild(el("div", "cmd-item-sub", it.sub));
        btn.appendChild(left);
        btn.appendChild(el("span", "badge badge-outline", it.group));
        btn.addEventListener("click", () => {
          dialog.close();
          it.action();
        });
        resultsHost.appendChild(btn);
      });
    }

    function openDialog() {
      input.value = "";
      activeIndex = 0;
      renderList();
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
      input.focus();
    }

    triggerBtn.addEventListener("click", openDialog);
    closeBtn.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (ev) => {
      if (ev.target === dialog) dialog.close();
    });

    input.addEventListener("input", () => {
      activeIndex = 0;
      renderList();
    });

    input.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        activeIndex = (activeIndex + 1) % Math.max(visibleItems.length, 1);
        renderList();
      } else if (ev.key === "ArrowUp") {
        ev.preventDefault();
        activeIndex = (activeIndex - 1 + Math.max(visibleItems.length, 1)) % Math.max(visibleItems.length, 1);
        renderList();
      } else if (ev.key === "Enter" && visibleItems[activeIndex]) {
        ev.preventDefault();
        dialog.close();
        visibleItems[activeIndex].action();
      }
    });

    document.addEventListener("keydown", (ev) => {
      const tag = document.activeElement ? document.activeElement.tagName : "";
      const isEditing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        openDialog();
      } else if (ev.key === "/" && !isEditing && !dialog.open) {
        ev.preventDefault();
        openDialog();
      }
    });
  }

  function validateSafeProxyBaseUrl(rawValue) {
    const trimmed = (rawValue || "").trim().replace(/\/+$/, "");
    if (!trimmed) return { ok: false, error: "Proxy URL boş." };
    let parsed;
    try {
      parsed = new URL(trimmed);
    } catch {
      return { ok: false, error: "Geçersiz URL biçimi." };
    }
    const isLocalHttp =
      parsed.protocol === "http:" &&
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");
    if (parsed.protocol !== "https:" && !isLocalHttp) {
      return {
        ok: false,
        error: "Güvenlik nedeniyle yalnızca https:// veya yerel http://127.0.0.1 / localhost kabul edilir."
      };
    }
    return { ok: true, origin: parsed.origin };
  }

  function formatSdkSnippet(langId, endpointPath, payloadObj) {
    const bodyJson = JSON.stringify(payloadObj);
    const code = payloadObj.fonKodu || payloadObj.fonKod || "AAL";
    const fundType = payloadObj.fonTipi || "YAT";
    const lang = payloadObj.dil || "TR";

    const byPath = {
      "/api/funds/fonGnlBlgSiraliGetir": {
        python: `funds = await client.get_funds(FundType.${fundType})`,
        javascript: `const funds = await client.getFunds(FundType.${fundType});`,
        go: `funds, err := client.GetFunds(tefas.FundType${fundType}, nil)`,
        dotnet: `var funds = await client.GetFundsAsync(FundType.${fundType});`,
        java: `List<Fund> funds = client.getFunds(FundType.${fundType});`,
        rust: `let funds = client.get_funds(FundType::${fundType[0] + fundType.slice(1).toLowerCase()}, None).await?;`
      },
      "/api/funds/dagilimSiraliGetirT": {
        python: `alloc = await client.get_allocation("${code}", FundType.${fundType})`,
        javascript: `const alloc = await client.getAllocation("${code}", FundType.${fundType});`,
        go: `alloc, err := client.GetAllocation("${code}", tefas.FundType${fundType}, nil)`,
        dotnet: `var alloc = await client.GetAllocationAsync("${code}", FundType.${fundType});`,
        java: `FundAllocation alloc = client.getAllocation("${code}", FundType.${fundType});`,
        rust: `let alloc = client.get_allocation("${code}", FundType::Yat, None).await?;`
      },
      "/api/funds/fonBilgiGetir": {
        python: `info = await client.get_fund_info("${code}", "${lang}")`,
        javascript: `const info = await client.getFundInfo("${code}", "${lang}");`,
        go: `info, err := client.GetFundInfo("${code}", "${lang}")`,
        dotnet: `var info = await client.GetFundInfoAsync("${code}", "${lang}");`,
        java: `FundInfo info = client.getFundInfo("${code}", "${lang}");`,
        rust: `let info = client.get_fund_info("${code}", "${lang}").await?;`
      },
      "/api/funds/fonProfilBilgiGetir": {
        python: `profile = await client.get_fund_profile("${code}", "${lang}")`,
        javascript: `const profile = await client.getFundProfile("${code}", "${lang}");`,
        go: `profile, err := client.GetFundProfile("${code}", "${lang}")`,
        dotnet: `var profile = await client.GetFundProfileAsync("${code}", "${lang}");`,
        java: `FundProfile profile = client.getFundProfile("${code}", "${lang}");`,
        rust: `let profile = client.get_fund_profile("${code}", "${lang}").await?;`
      },
      "/api/funds/fonFiyatBilgiGetir": {
        python: `pts = await client.get_period_price_history("${code}", "${payloadObj.periyod || "12"}", "${lang}")`,
        javascript: `const pts = await client.getPeriodPriceHistory("${code}", "${payloadObj.periyod || "12"}", "${lang}");`,
        go: `pts, err := client.GetPeriodPriceHistory("${code}", "${payloadObj.periyod || "12"}", "${lang}")`,
        dotnet: `var pts = await client.GetPeriodPriceHistoryAsync("${code}", "${payloadObj.periyod || "12"}", "${lang}");`,
        java: `List<PricePoint> pts = client.getPeriodPriceHistory("${code}", "${payloadObj.periyod || "12"}", "${lang}");`,
        rust: `let pts = client.get_period_price_history("${code}", "${payloadObj.periyod || "12"}", "${lang}").await?;`
      }
    };

    if (byPath[endpointPath] && byPath[endpointPath][langId]) {
      return `// Seçili parametrelerle örnek çağrı\n${byPath[endpointPath][langId]}`;
    }

    return `// POST https://www.tefas.gov.tr${endpointPath}\n// Payload:\n${JSON.stringify(payloadObj, null, 2)}\n// cURL eşdeğeri: '${bodyJson}'`;
  }

  function extractRowsForTable(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.resultList)) return payload.resultList;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && typeof payload === "object") return [payload];
    return [];
  }

  function formatCellValue(val) {
    if (val === null || val === undefined) return "—";
    if (typeof val === "object") return JSON.stringify(val);
    const s = String(val);
    return s.length > 90 ? s.slice(0, 87) + "…" : s;
  }

  function initPlayground() {
    const endpointSelect = document.getElementById("pg-endpoint-select");
    const endpointNote = document.getElementById("pg-endpoint-note");
    const presetsHost = document.getElementById("pg-presets");
    const modeSelect = document.getElementById("pg-mode-select");
    const sendBtn = document.getElementById("pg-send-btn");
    const proxyRow = document.getElementById("pg-proxy-row");
    const proxyInput = document.getElementById("pg-proxy-input");
    const proxyHint = document.getElementById("pg-proxy-hint");
    const proxyCheckBtn = document.getElementById("pg-proxy-check-btn");
    const connBadge = document.getElementById("pg-connection-badge");
    const formPanel = document.getElementById("pg-form-panel");
    const jsonPanel = document.getElementById("pg-json-panel");
    const jsonTextarea = document.getElementById("pg-json-textarea");
    const jsonError = document.getElementById("pg-json-error");
    const alertBox = document.getElementById("pg-alert-box");

    const statusBadge = document.getElementById("pg-status-badge");
    const latencyBadge = document.getElementById("pg-latency-badge");
    const countBadge = document.getElementById("pg-count-badge");
    const tableWrap = document.getElementById("pg-resp-table-wrap");
    const jsonWrap = document.getElementById("pg-resp-json-wrap");
    const jsonCode = document.getElementById("pg-resp-json-code");
    const codeWrap = document.getElementById("pg-resp-code-wrap");
    const codeText = document.getElementById("pg-resp-code-text");
    const copyRespBtn = document.getElementById("pg-copy-resp-btn");

    let currentPath = data.httpEndpoints[0].path;
    let currentPayload = {};
    let currentReqTab = "form";
    let currentRespTab = "table";
    let currentCodeKind = "curl";
    let lastResponseText = "";

    const grouped = new Map();
    data.httpEndpoints.forEach((ep) => {
      const grp = ep.group || "Diğer";
      if (!grouped.has(grp)) grouped.set(grp, []);
      grouped.get(grp).push(ep);
    });
    grouped.forEach((eps, grpName) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = grpName;
      eps.forEach((ep) => {
        const opt = document.createElement("option");
        opt.value = ep.path;
        opt.textContent = `${ep.path.replace("/api/funds/", "").replace("/api/announcements/", "")} — ${ep.title}`;
        optgroup.appendChild(opt);
      });
      endpointSelect.appendChild(optgroup);
    });

    const savedProxy = localStorage.getItem(STORAGE_PROXY_KEY);
    if (savedProxy) {
      proxyInput.value = savedProxy;
    } else if (isLocalHost) {
      proxyInput.value = window.location.origin;
    }

    function updateConnectionHint() {
      const mode = modeSelect.value;
      proxyRow.hidden = mode !== "live-proxy";
      if (mode === "demo") {
        connBadge.className = "badge badge-secondary";
        connBadge.textContent = "Offline Örnek Modu";
        return;
      }
      if (mode === "live-direct") {
        connBadge.className = "badge badge-warning";
        connBadge.textContent = "Doğrudan Tarayıcı İsteği (CORS'a Bağlı)";
        return;
      }
      const typed = proxyInput.value.trim();
      if (!typed && isLocalHost) {
        proxyHint.textContent = "Yerel same-origin sunucu algılandı (" + window.location.origin + ").";
        connBadge.className = "badge badge-success";
        connBadge.textContent = "Yerel Proxy Hazır";
      } else if (typed) {
        proxyHint.textContent = "Girilen adres üzerinden /api/... POST istekleri yönlendirilir.";
        connBadge.className = "badge badge-outline";
        connBadge.textContent = "Özel Proxy Yapılandırıldı";
      } else {
        proxyHint.textContent = "GitHub Pages üzerinde canlı istek için aşağıdan Worker veya python scripts/tefas_proxy.py URL'si girin.";
        connBadge.className = "badge badge-outline";
        connBadge.textContent = "Proxy URL Bekleniyor";
      }
    }

    function buildDefaultPayload(ep, overrides) {
      const obj = {};
      (ep.fields || []).forEach((f) => {
        let val;
        if (overrides && Object.prototype.hasOwnProperty.call(overrides, f.key)) {
          val = overrides[f.key];
        } else if (f.kind === "date") {
          val = formatTradingYyyymmdd(f.defaultOffsetDays || 0);
        } else {
          val = f.defaultValue !== undefined ? f.defaultValue : "";
        }
        obj[f.key] = val;
        if (f.mirrorTo) {
          obj[f.mirrorTo] = val;
        }
      });
      return obj;
    }

    function renderFormFields(ep) {
      formPanel.replaceChildren();
      (ep.fields || []).forEach((f) => {
        const wrap = el("div", "field-group");
        const label = el("label", "field-label", f.label);
        const inputId = `pg-f-${f.key}`;
        label.setAttribute("for", inputId);
        wrap.appendChild(label);

        let control;
        if (f.kind === "select") {
          control = el("select", "input");
          (f.options || []).forEach((optVal) => {
            const opt = el("option", "", optVal);
            opt.value = optVal;
            control.appendChild(opt);
          });
          control.value = String(currentPayload[f.key] ?? f.defaultValue ?? "");
        } else {
          control = el("input", "input mono-input");
          control.type = f.kind === "number" ? "number" : "text";
          if (f.placeholder) control.placeholder = f.placeholder;
          control.value = String(currentPayload[f.key] ?? "");
        }
        control.id = inputId;
        control.addEventListener("input", () => {
          let nextVal = control.value;
          if (f.kind === "number") {
            const num = Number(nextVal);
            nextVal = Number.isFinite(num) ? num : 1;
          }
          currentPayload[f.key] = nextVal;
          if (f.mirrorTo) {
            currentPayload[f.mirrorTo] = nextVal;
          }
          syncJsonAndCodeFromPayload();
        });
        wrap.appendChild(control);
        formPanel.appendChild(wrap);
      });
    }

    function syncJsonAndCodeFromPayload() {
      jsonTextarea.value = JSON.stringify(currentPayload, null, 2);
      jsonError.hidden = true;
      refreshGeneratedCode();
    }

    function refreshGeneratedCode() {
      const compactBody = JSON.stringify(currentPayload);
      if (currentCodeKind === "curl") {
        codeText.textContent = buildCurlCommand(currentPath, compactBody);
      } else {
        codeText.textContent = formatSdkSnippet(activeLang, currentPath, currentPayload);
      }
    }

    function showAlert(kind, message, includeDemoAction) {
      alertBox.className = `alert alert-${kind}`;
      alertBox.replaceChildren();
      alertBox.appendChild(document.createTextNode(message + " "));
      if (includeDemoAction) {
        const switchBtn = el("button", "btn btn-outline btn-xs", "Örnek Yanıt ile Dene");
        switchBtn.type = "button";
        switchBtn.addEventListener("click", () => {
          modeSelect.value = "demo";
          updateConnectionHint();
          executeRequest();
        });
        alertBox.appendChild(switchBtn);
      }
      alertBox.hidden = false;
    }

    function hideAlert() {
      alertBox.hidden = true;
      alertBox.replaceChildren();
    }

    function renderResponse(payload, meta) {
      statusBadge.className = `badge badge-${meta.statusTone}`;
      statusBadge.textContent = meta.statusText;
      latencyBadge.textContent = `${meta.latencyMs} ms`;

      const rows = extractRowsForTable(payload);
      countBadge.textContent = `${rows.length} kayıt`;

      lastResponseText = JSON.stringify(payload, null, 2);
      const maxChars = 48_000;
      jsonCode.textContent =
        lastResponseText.length > maxChars
          ? lastResponseText.slice(0, maxChars) + "\n\n... (yanıt önizleme için kısaltıldı; tam JSON'u kopyalayabilirsiniz)"
          : lastResponseText;

      tableWrap.replaceChildren();
      if (rows.length === 0) {
        tableWrap.appendChild(el("div", "empty-cell", "Gösterilecek tablo kaydı yok."));
      } else {
        const previewRows = rows.slice(0, 50);
        const colSet = new Set();
        previewRows.forEach((r) => {
          if (r && typeof r === "object") {
            Object.keys(r).forEach((k) => colSet.add(k));
          }
        });
        const cols = Array.from(colSet).slice(0, 12);
        const table = el("table");
        const thead = el("thead");
        const htr = el("tr");
        cols.forEach((c) => htr.appendChild(el("th", "", c)));
        thead.appendChild(htr);

        const tbody = el("tbody");
        previewRows.forEach((r) => {
          const tr = el("tr");
          cols.forEach((c) => tr.appendChild(el("td", "", formatCellValue(r ? r[c] : undefined))));
          tbody.appendChild(tr);
        });
        table.appendChild(thead);
        table.appendChild(tbody);
        tableWrap.appendChild(table);
        if (rows.length > 50) {
          const note = el("div", "empty-cell", `İlk 50 kayıt gösteriliyor (toplam ${rows.length}).`);
          tableWrap.appendChild(note);
        }
      }
      refreshGeneratedCode();
    }

    async function checkProxyHealth() {
      const checkUrl = validateSafeProxyBaseUrl(proxyInput.value || (isLocalHost ? window.location.origin : DEFAULT_LOCAL_PROXY));
      if (!checkUrl.ok) {
        showAlert("warning", checkUrl.error, false);
        return;
      }
      connBadge.className = "badge badge-secondary";
      connBadge.textContent = "Test ediliyor…";
      try {
        const resp = await fetch(`${checkUrl.origin}/health`, { method: "GET" });
        const body = await resp.json();
        if (resp.ok && body && body.ok) {
          if (!proxyInput.value.trim()) {
            proxyInput.value = checkUrl.origin;
            localStorage.setItem(STORAGE_PROXY_KEY, checkUrl.origin);
          }
          modeSelect.value = "live-proxy";
          updateConnectionHint();
          connBadge.className = "badge badge-success";
          connBadge.textContent = "Proxy Bağlı (Canlı)";
          hideAlert();
        } else {
          connBadge.className = "badge badge-danger";
          connBadge.textContent = `Proxy Yanıt Vermedi (${resp.status})`;
        }
      } catch {
        connBadge.className = "badge badge-warning";
        connBadge.textContent = "Proxy Erişilemiyor";
        showAlert(
          "warning",
          "Yerel proxy çalışmıyor. Terminalde 'python scripts/tefas_proxy.py' çalıştırabilir veya Cloudflare Worker URL'si girebilirsiniz.",
          true
        );
      }
    }

    async function executeRequest() {
      const safePath = ALLOWED_ENDPOINT_PATHS.get(currentPath);
      const ep = ENDPOINT_BY_PATH.get(currentPath);
      if (!safePath || !ep) return;

      if (currentReqTab === "json") {
        try {
          const parsed = JSON.parse(jsonTextarea.value);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("JSON nesnesi gerekli");
          }
          currentPayload = parsed;
          renderFormFields(ep);
          jsonError.hidden = true;
        } catch (err) {
          jsonError.textContent = `Geçersiz JSON: ${err.message}`;
          jsonError.hidden = false;
          return;
        }
      }

      hideAlert();
      const mode = modeSelect.value;

      if (mode === "demo") {
        renderResponse(ep.sampleResponse, {
          statusTone: "secondary",
          statusText: "Demo (Fixture)",
          latencyMs: 0
        });
        return;
      }

      let targetUrl = "";
      if (mode === "live-direct") {
        targetUrl = "https://www.tefas.gov.tr" + safePath;
      } else {
        const rawProxy = proxyInput.value.trim() || (isLocalHost ? window.location.origin : "");
        if (!rawProxy) {
          showAlert(
            "warning",
            "GitHub Pages üzerinden doğrudan TEFAS tarayıcı CORS engeline takılır. Canlı istek için Proxy URL girin veya 'Örnek Yanıt (Offline)' modunu seçin.",
            true
          );
          document.getElementById("pg-cors-guide").open = true;
          return;
        }
        const check = validateSafeProxyBaseUrl(rawProxy);
        if (!check.ok) {
          showAlert("danger", check.error, false);
          return;
        }
        localStorage.setItem(STORAGE_PROXY_KEY, check.origin);
        targetUrl = check.origin + safePath;
      }

      sendBtn.disabled = true;
      sendBtn.textContent = "Gönderiliyor…";
      const t0 = performance.now();

      try {
        const resp = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(currentPayload)
        });
        const elapsed = Math.round(performance.now() - t0);
        const text = await resp.text();
        let parsedBody;
        try {
          parsedBody = JSON.parse(text);
        } catch {
          parsedBody = { rawText: text.slice(0, 1200) };
        }

        if (!resp.ok) {
          showAlert("danger", `HTTP ${resp.status} hatası döndü.`, true);
        } else if (parsedBody && parsedBody.errorCode) {
          showAlert("warning", `TEFAS Uyarısı (${parsedBody.errorCode}): ${parsedBody.errorMessage || ""}`, false);
        }

        renderResponse(parsedBody, {
          statusTone: resp.ok ? "success" : "danger",
          statusText: `${resp.status} ${resp.ok ? "OK" : "Hata"}`,
          latencyMs: elapsed
        });
      } catch {
        const elapsed = Math.round(performance.now() - t0);
        statusBadge.className = "badge badge-warning";
        statusBadge.textContent = mode === "live-direct" ? "CORS Engeli" : "Bağlantı Hatası";
        latencyBadge.textContent = `${elapsed} ms`;

        if (mode === "live-direct") {
          showAlert(
            "warning",
            "Tarayıcı CORS politikası tefas.gov.tr yanıtını engelledi (sunucu Access-Control-Allow-Origin göndermiyor). Aşağıdaki Proxy rehberiyle canlı çalıştırabilir veya örnek yanıtı inceleyebilirsiniz.",
            true
          );
        } else {
          showAlert(
            "warning",
            "Proxy adresine bağlanılamadı. 'python scripts/tefas_proxy.py' çalıştığından veya Worker URL'nizin aktif olduğundan emin olun.",
            true
          );
        }
        document.getElementById("pg-cors-guide").open = true;
      } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = "İstek Gönder";
      }
    }

    function loadEndpoint(path, overrides) {
      const ep = ENDPOINT_BY_PATH.get(path);
      if (!ep) return;
      currentPath = ep.path;
      endpointSelect.value = ep.path;
      endpointNote.textContent = `${ep.usedBy} — ${ep.notes}`;
      currentPayload = buildDefaultPayload(ep, overrides);
      renderFormFields(ep);
      syncJsonAndCodeFromPayload();
      renderResponse(ep.sampleResponse, {
        statusTone: "secondary",
        statusText: "Örnek Şema",
        latencyMs: 0
      });
      hideAlert();
      document.getElementById("playground").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    data.playground.presets.forEach((p, idx) => {
      const btn = el("button", idx === 0 ? "btn btn-outline btn-xs active" : "btn btn-outline btn-xs", p.label);
      btn.type = "button";
      btn.addEventListener("click", () => {
        presetsHost.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        loadEndpoint(p.path, p.values);
      });
      presetsHost.appendChild(btn);
    });

    endpointSelect.addEventListener("change", () => {
      const ep = ENDPOINT_BY_PATH.get(endpointSelect.value);
      if (!ep) return;
      currentPath = ep.path;
      endpointNote.textContent = `${ep.usedBy} — ${ep.notes}`;
      currentPayload = buildDefaultPayload(ep);
      renderFormFields(ep);
      syncJsonAndCodeFromPayload();
      renderResponse(ep.sampleResponse, {
        statusTone: "secondary",
        statusText: "Örnek Şema",
        latencyMs: 0
      });
      hideAlert();
    });

    modeSelect.addEventListener("change", updateConnectionHint);
    proxyInput.addEventListener("input", () => {
      const trimmed = proxyInput.value.trim();
      if (trimmed) {
        localStorage.setItem(STORAGE_PROXY_KEY, trimmed);
      } else {
        localStorage.removeItem(STORAGE_PROXY_KEY);
      }
      updateConnectionHint();
    });
    proxyCheckBtn.addEventListener("click", checkProxyHealth);
    sendBtn.addEventListener("click", executeRequest);

    document.querySelectorAll("[data-pg-req-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentReqTab = btn.dataset.pgReqTab;
        document.querySelectorAll("[data-pg-req-tab]").forEach((b) => b.classList.toggle("active", b === btn));
        formPanel.hidden = currentReqTab !== "form";
        jsonPanel.hidden = currentReqTab !== "json";
      });
    });

    jsonTextarea.addEventListener("input", () => {
      try {
        const parsed = JSON.parse(jsonTextarea.value);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          currentPayload = parsed;
          jsonError.hidden = true;
          refreshGeneratedCode();
        }
      } catch {
        // User may still be typing JSON; validation runs cleanly on Send.
      }
    });

    document.querySelectorAll("[data-pg-resp-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentRespTab = btn.dataset.pgRespTab;
        document.querySelectorAll("[data-pg-resp-tab]").forEach((b) => b.classList.toggle("active", b === btn));
        tableWrap.hidden = currentRespTab !== "table";
        jsonWrap.hidden = currentRespTab !== "json";
        codeWrap.hidden = currentRespTab !== "code";
      });
    });

    document.querySelectorAll("[data-pg-code-kind]").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentCodeKind = btn.dataset.pgCodeKind;
        document.querySelectorAll("[data-pg-code-kind]").forEach((b) => b.classList.toggle("active", b === btn));
        refreshGeneratedCode();
      });
    });

    copyRespBtn.addEventListener("click", () => {
      const txt = currentRespTab === "code" ? codeText.textContent : lastResponseText;
      copyToClipboard(txt || "", copyRespBtn, "Kopyala");
    });

    const localCmdEl = document.getElementById("local-proxy-cmd");
    const workerCodeEl = document.getElementById("worker-template-code");
    localCmdEl.textContent = data.playground.localProxyCommand;
    workerCodeEl.textContent = data.playground.workerTemplate;

    document.getElementById("copy-local-proxy-btn").addEventListener("click", (ev) => {
      copyToClipboard(data.playground.localProxyCommand, ev.currentTarget, "Komutu Kopyala");
    });
    document.getElementById("copy-worker-btn").addEventListener("click", (ev) => {
      copyToClipboard(data.playground.workerTemplate, ev.currentTarget, "Kodu Kopyala");
    });

    const firstPreset = data.playground.presets[0];
    const initEp = ENDPOINT_BY_PATH.get(firstPreset.path) || data.httpEndpoints[0];
    currentPath = initEp.path;
    endpointSelect.value = initEp.path;
    endpointNote.textContent = `${initEp.usedBy} — ${initEp.notes}`;
    currentPayload = buildDefaultPayload(initEp, firstPreset.values);
    renderFormFields(initEp);
    syncJsonAndCodeFromPayload();
    renderResponse(initEp.sampleResponse, {
      statusTone: "secondary",
      statusText: "Örnek Şema",
      latencyMs: 0
    });

    if (!isLocalHost && !savedProxy) {
      modeSelect.value = "demo";
    }
    updateConnectionHint();
    if (isLocalHost) {
      checkProxyHealth();
    }

    playgroundController = {
      loadEndpoint(path, overrides) {
        loadEndpoint(path, overrides);
      },
      refreshGeneratedCode
    };
  }

  function wireShellControls() {
    const themeBtn = document.getElementById("theme-toggle");
    themeBtn.addEventListener("click", () => {
      activeTheme = activeTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", activeTheme);
      localStorage.setItem(STORAGE_THEME_KEY, activeTheme);
    });

    const menuBtn = document.getElementById("menu-toggle");
    const sidebar = document.getElementById("sidebar");
    menuBtn.addEventListener("click", () => sidebar.classList.toggle("open"));
  }

  renderGlobalLangBar();
  renderHeroStats();
  initPlayground();
  renderArchitecture();
  renderQuickstart();
  renderFundTypes();
  renderMatrix();
  renderMethods();
  renderHttpReference();
  renderModelsAndErrors();
  renderSidebar();
  initCommandPalette();
  wireShellControls();
})();
