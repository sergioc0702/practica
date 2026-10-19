window.Pyme360App = (function () {
  "use strict";

  // v2 starts clean for each browser; legacy demo records remain untouched in v1.
  /* Configuración, preferencias y almacenamiento */
  const STORAGE_KEY = "pyme360.demo.v2";
  const THEME_KEY = "pyme360.theme";
  const SIDEBAR_KEY = "pyme360.sidebar.collapsed";
  const PUBLIC_BENCHMARK_CACHE_KEY = "pyme360.public-benchmark.ods-7-3-1.v2";

  const pages = {
    overview: "Inicio",
    sales: "Ventas",
    purchases: "Compras",
    inventory: "Inventario",
    production: "Producción",
    finance: "Finanzas",
    environment: "Impacto ambiental",
    contacts: "Contactos",
    data: "Datos y Excel"
  };

  const now = new Date();
  let currentPeriod = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  let currentPage = "overview";
  let state = loadState();
  let currentTheme = loadTheme();
  let sidebarCollapsed = loadSidebarCollapsed();
  let importSession = null;
  let receiptSession = null;
  let activeReceiptRead = null;
  let publicBenchmarkState = { status: "idle", data: null, cachedAt: "", error: "" };

  function loadTheme() {
    try {
      return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
    } catch (error) {
      return "light";
    }
  }

  function loadSidebarCollapsed() {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "true";
    } catch (error) {
      return false;
    }
  }

  function setSidebarCollapsed(collapsed) {
    sidebarCollapsed = Boolean(collapsed);
    document.documentElement.classList.toggle("sidebar-collapsed", sidebarCollapsed);

    var toggle = document.querySelector(".sidebar-toggle");
    if (toggle) {
      var label = sidebarCollapsed ? "Expandir menú" : "Contraer menú";
      toggle.textContent = sidebarCollapsed ? "›" : "‹";
      toggle.setAttribute("aria-label", label);
      toggle.setAttribute("title", label);
      toggle.setAttribute("aria-expanded", String(!sidebarCollapsed));
    }

    document.querySelectorAll(".nav-item").forEach(function (item) {
      var label = item.querySelector(".nav-icon + span");
      if (!label) return;
      var name = label.textContent.trim();
      item.setAttribute("aria-label", name);
      item.setAttribute("title", name);
    });

    var companyButton = document.querySelector(".company-switcher");
    if (companyButton) companyButton.setAttribute("title", "Configura tu empresa");
    var profileButton = document.querySelector(".profile-button");
    if (profileButton) profileButton.setAttribute("title", "Mi usuario · Administrador");

    try {
      localStorage.setItem(SIDEBAR_KEY, String(sidebarCollapsed));
    } catch (error) {
      // El menú sigue funcionando aunque el navegador no permita guardar la preferencia.
    }
  }

  function setTheme(theme) {
    currentTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", currentTheme);
    var toggle = document.getElementById("theme-toggle");
    if (toggle) {
      var dark = currentTheme === "dark";
      toggle.textContent = dark ? "☀" : "☾";
      toggle.setAttribute("aria-label", dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
      toggle.setAttribute("title", dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
    }
    try {
      localStorage.setItem(THEME_KEY, currentTheme);
    } catch (error) {
      // El tema sigue aplicado a esta sesión aunque el navegador no permita guardarlo.
    }
  }

  function seedState() {
    return {
      company: "",
      companyNit: "",
      city: "",
      activityType: "",
      contacts: [],
      inventory: [],
      sales: [],
      purchases: [],
      production: [],
      environment: [],
      environmentTargets: { energyReductionPct: null, waterReductionPct: null },
      activity: [],
      importExtras: []
    };
  }

  function loadState() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return seedState();
      var parsed = JSON.parse(saved);
      var defaults = seedState();
      Object.keys(defaults).forEach(function (key) {
        if (Array.isArray(defaults[key])) {
          if (!Array.isArray(parsed[key])) parsed[key] = defaults[key];
        } else if (parsed[key] == null) parsed[key] = defaults[key];
      });
      if (!parsed.environmentTargets || typeof parsed.environmentTargets !== "object") parsed.environmentTargets = defaults.environmentTargets;
      ["energyReductionPct", "waterReductionPct"].forEach(function (key) {
        var value = parsed.environmentTargets[key];
        var percentage = Number(value);
        parsed.environmentTargets[key] = value != null && Number.isInteger(percentage) && percentage >= 1 && percentage <= 99 ? percentage : null;
      });
      parsed.environment.forEach(function (record) {
        if (!record.readingSources) record.readingSources = {};
        if (!record.readingSources.energy && record.energySource) record.readingSources.energy = { label: record.energySource, method: record.energyMethod || "manual", confirmedAt: record.energyCapturedAt || "" };
        if (!record.readingSources.water && record.waterSource) record.readingSources.water = { label: record.waterSource, method: record.waterMethod || "manual", confirmedAt: record.waterCapturedAt || "" };
      });
      return parsed;
    } catch (error) {
      return seedState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      toast("No se pudo guardar", "El navegador no permitió guardar más datos. Exporta la información antes de cerrar.");
    }
  }

  /* Formato y utilidades compartidas */
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function money(value) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value) || 0);
  }

  function num(value, digits) {
    return new Intl.NumberFormat("es-CO", { maximumFractionDigits: digits == null ? 0 : digits }).format(Number(value) || 0);
  }

  function today() {
    var local = new Date();
    return local.getFullYear() + "-" + String(local.getMonth() + 1).padStart(2, "0") + "-" + String(local.getDate()).padStart(2, "0");
  }

  function dateLabel(value) {
    var parts = String(value || "").split("-");
    return parts.length === 3 ? parts[2] + "/" + parts[1] + "/" + parts[0] : value;
  }

  function monthName(period) {
    var parts = String(period).split("-");
    return new Intl.DateTimeFormat("es-CO", { month: "long" }).format(new Date(Number(parts[0]), Number(parts[1]) - 1, 1));
  }

  function currentEnvironment() {
    return state.environment.find(function (item) { return item.period === currentPeriod; }) || {
      period: currentPeriod, electricityKwh: 0, waterM3: 0, fuelL: 0, organicKg: 0,
      recyclableKg: 0, nonRecyclableKg: 0, hazardousKg: 0, recycledKg: 0, productionUnits: 0,
      readingSources: {}
    };
  }

  function upsertEnvironment(record) {
    var index = state.environment.findIndex(function (item) { return item.period === record.period; });
    if (index >= 0) state.environment[index] = record;
    else state.environment.push(record);
  }

  function addActivity(text, detail, icon) {
    state.activity.unshift({ text: text, detail: detail, time: "Ahora", icon: icon || "•" });
    state.activity = state.activity.slice(0, 8);
  }

  function setPage(page) {
    if (!pages[page]) return;
    closeModal();
    currentPage = page;
    document.getElementById("sidebar").classList.remove("open");
    render();
    if (page === "environment") loadPublicBenchmark(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getPendingSalesCount() {
    return state.sales.filter(function (sale) { return sale.status === "Pendiente de pago"; }).length;
  }

  function updateBranding() {
    var companyName = state.company || "Configura tu empresa";
    var companyPrefix = state.company ? state.company.trim().charAt(0).toUpperCase() : "＋";

    document.getElementById("page-title").textContent = pages[currentPage];
    document.querySelector(".company-switcher .company-meta strong").textContent = companyName;
    document.querySelector(".breadcrumb > span:first-child").textContent = state.company || "Tu empresa";
    document.querySelector(".company-avatar").textContent = companyPrefix;
  }

  function updateNavigationState() {
    document.querySelectorAll(".nav-item[data-page]").forEach(function (item) {
      var isCurrentPage = item.getAttribute("data-page") === currentPage;
      item.classList.toggle("active", isCurrentPage);
      if (isCurrentPage) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });

    document.getElementById("sales-nav-count").textContent = String(getPendingSalesCount());
  }

  function render() {
    updateBranding();
    document.getElementById("page-content").innerHTML = pageRenderer(currentPage)();
    updateNavigationState();
  }

  /* Renderizadores de páginas */
  function pageRenderer(page) {
    return {
      overview: renderOverview, sales: renderSales, purchases: renderPurchases,
      inventory: renderInventory, production: renderProduction, finance: renderFinance,
      environment: renderEnvironment, contacts: renderContacts, data: renderData
    }[page];
  }

  function heading(eyebrow, title, subtitle, actions) {
    return '<div class="page-heading"><div><div class="eyebrow">' + eyebrow + '</div><h1>' + title + '</h1><p>' + subtitle + '</p></div><div class="heading-actions">' + (actions || "") + '</div></div>';
  }

  function metricCard(label, value, note, icon, warn) {
    return '<div class="metric-card"><div class="metric-top"><span>' + label + '</span><span class="metric-icon">' + icon + '</span></div><div class="metric-value">' + value + '</div><div class="metric-foot"><span class="metric-change' + (warn ? " warn" : "") + '">' + (warn ? "≈" : "•") + '</span>' + note + '</div></div>';
  }

  function quickAction(icon, title, detail, action) {
    return '<button class="quick-action" data-action="' + action + '"><span class="quick-icon">' + icon + '</span><span><strong>' + title + '</strong><small>' + detail + '</small></span><span class="quick-arrow">›</span></button>';
  }

  function getStatusStyle(status, forcedStyle) {
    if (forcedStyle) return forcedStyle;
    if (status === "Pagada" || status === "Terminada" || status === "Recibida") return "";
    if (status === "Por recibir" || status === "Pendiente de pago" || status.indexOf("Pendiente") === 0) return "pending";
    return "neutral";
  }

  function statusBadge(status, forcedStyle) {
    return '<span class="status ' + getStatusStyle(status, forcedStyle) + '">' + esc(status) + '</span>';
  }

  function renderOverview() {
    var due = state.sales.filter(function (sale) { return sale.status === "Pendiente de pago"; }).reduce(function (sum, sale) { return sum + sale.total; }, 0);
    var record = currentEnvironment();
    var emissions = estimateEmissions(record);
    var monthSales = state.sales.filter(function (sale) { return sale.date.slice(0, 7) === currentPeriod; }).reduce(function (sum, sale) { return sum + sale.total; }, 0);
    var months = state.environment.slice(-6);
    var maxProduction = Math.max.apply(null, months.map(function (item) { return item.productionUnits || 0; }).concat([1]));
    var maxEnergy = Math.max.apply(null, months.map(function (item) { return item.electricityKwh || 0; }).concat([1]));
    var bars = months.map(function (item) {
      return '<div class="bar-group"><div class="bar" style="height:' + Math.max(5, Math.round((item.productionUnits / maxProduction) * 84)) + '%"></div><div class="bar current" style="height:' + Math.max(5, Math.round((item.electricityKwh / maxEnergy) * 84)) + '%"></div><small>' + esc(item.period.slice(5)) + '</small></div>';
    }).join("");
    var activity = state.activity.slice(0, 3).map(function (item) {
      return '<tr><td><span class="contact-avatar">' + esc(item.icon) + '</span><strong style="display:inline">' + esc(item.text) + '</strong><small>' + esc(item.detail) + '</small></td><td class="table-subtle">' + esc(item.time) + '</td></tr>';
    }).join("");
    var day = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric" }).format(new Date());
    var onboarding = !state.company || !state.contacts.length || !state.inventory.length ?
      '<section class="panel section-spacer"><div class="panel-header"><div><h2>Tu empresa empieza con tus propios datos</h2><p>Completa estos pasos cuando estés listo. Nada viene precargado.</p></div><span class="status neutral">' + ((state.company ? 1 : 0) + (state.contacts.length ? 1 : 0) + (state.inventory.length ? 1 : 0)) + ' de 3 pasos</span></div><div class="panel-body quick-actions">' +
      quickAction("⌂", state.company ? "Empresa configurada" : "Configura tu empresa", "Nombre, NIT y actividad", "setup") +
      '<button class="quick-action" data-page="contacts"><span class="quick-icon">♙</span><span><strong>' + (state.contacts.length ? "Agrega más contactos" : "Registra tu primer cliente o proveedor") + '</strong><small>Solo aparecen los contactos de tu empresa</small></span><span class="quick-arrow">›</span></button>' +
      quickAction("▦", state.inventory.length ? "Completa tu inventario" : "Agrega tus productos", "Productos, materias primas e insumos", "new-product") +
      '</div></section>' : "";
    return heading(day.toUpperCase() + " · " + monthName(currentPeriod).toUpperCase(), state.company ? 'Resumen de tu negocio <span style="font-size:22px">👋</span>' : '¡Empecemos con lo básico! <span style="font-size:22px">👋</span>', state.company ? "Aquí tienes un resumen claro de cómo va tu negocio." : "Configura la empresa y registra tus propios datos para empezar.", '<span class="date-pill"><span>▣</span> ' + monthName(currentPeriod) + " " + currentPeriod.slice(0, 4) + '</span>') + onboarding +
      '<section class="metric-grid">' +
      metricCard("Ventas del mes", money(monthSales), "Registrado en " + monthName(currentPeriod), "↗", false) +
      metricCard("Por cobrar", money(due), state.sales.filter(function (sale) { return sale.status === "Pendiente de pago"; }).length + " facturas pendientes", "◷", false) +
      metricCard("Órdenes activas", String(state.production.filter(function (order) { return order.status === "En proceso"; }).length).padStart(2, "0"), "Producción en curso", "⚙", false) +
      metricCard("Emisiones estimadas", num(emissions / 1000, 2) + " t", "Estimación demostrativa", "♧", true) + '</section>' +
      '<section class="dashboard-grid"><div class="panel"><div class="panel-header"><div><h2>Tu operación, de un vistazo</h2><p>Un resumen mensual para tomar mejores decisiones.</p></div><span class="status neutral">Últimos meses</span></div><div class="panel-body"><div class="chart-summary"><strong>' + num(record.productionUnits) + '</strong><span>unidades producidas este mes</span><div class="chart-legend"><span><i class="legend-dot"></i>Producción</span><span><i class="legend-dot pale"></i>Energía</span></div></div><div class="chart-wrap"><div class="chart-y"><span>Alto</span><span>Medio</span><span>Bajo</span><span>0</span></div><div class="chart-bars">' + bars + '</div></div><div class="chart-footer"><span>Tendencia relativa por indicador</span><span>Datos registrados</span></div></div></div>' +
      '<div class="panel"><div class="panel-header"><div><h2>¿Qué necesitas hacer?</h2><p>Atajos para las tareas de hoy.</p></div></div><div class="panel-body"><div class="quick-actions">' +
      quickAction("↗", "Registrar una venta", "Crea un registro para tu cliente", "new-sale") +
      quickAction("⚙", "Iniciar producción", "Registra una nueva orden", "new-production") +
      quickAction("♧", "Anotar consumos del mes", "Agua, energía y residuos", "new-environment") +
      '</div><div class="notice"><span class="notice-icon">✦</span><span><strong>Pequeños cambios, gran impacto.</strong><br>Consulta recomendaciones para reducir consumos y desperdicios.</span></div></div></div></section>' +
      '<section class="panel list-panel"><div class="panel-header"><div><h2>Actividad reciente</h2><p>Lo último que pasó en tu negocio.</p></div><button class="panel-link" data-page="sales">Ver ventas →</button></div><div class="table-wrap"><table><thead><tr><th>ACTIVIDAD</th><th>CUÁNDO</th></tr></thead><tbody>' + (activity || '<tr><td colspan="2"><div class="empty-state"><strong>Aquí verás los movimientos de tu empresa</strong><p>Cuando registres una venta, compra o producción, aparecerá en esta lista.</p></div></td></tr>') + '</tbody></table></div></section>';
  }

  function renderSales() {
    var list = state.sales.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    var rows = list.map(function (sale) {
      return '<tr><td><strong>' + esc(sale.number) + '</strong><small>' + dateLabel(sale.date) + '</small></td><td><strong>' + esc(sale.customer) + '</strong><small>' + esc(sale.payment || "Contado") + '</small></td><td>' + sale.lines.reduce(function (sum, line) { return sum + line.quantity; }, 0) + ' und.</td><td><strong>' + money(sale.total) + '</strong></td><td>' + statusBadge(sale.status) + '</td><td><button class="button-quiet" data-action="sale-detail" data-id="' + esc(sale.id) + '">Ver</button></td></tr>';
    }).join("");
    return heading("TU NEGOCIO", "Ventas", "Registra pedidos, consulta tus facturas y revisa qué te falta por cobrar.", '<button class="button button-primary" data-action="new-sale"><span>＋</span> Registrar venta</button>') +
      '<div class="toolbar"><div class="toolbar-left"><label class="search-field"><span>⌕</span><input type="search" placeholder="Buscar cliente o factura" data-filter="sales"></label><select class="filter-select" id="sales-status"><option value="Todas">Todos los estados</option><option>Pendiente de pago</option><option>Pagada</option></select></div><span class="muted-note">' + list.length + ' ventas</span></div>' +
      '<section class="panel list-panel"><div class="table-wrap"><table><thead><tr><th>FACTURA</th><th>CLIENTE</th><th>PRODUCTOS</th><th>TOTAL</th><th>ESTADO</th><th></th></tr></thead><tbody id="sales-rows">' + (rows || '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">↗</div><strong>Aún no tienes ventas</strong><p>Registra tu primera venta y lleva el control desde aquí.</p><button class="button button-primary" data-action="new-sale">Registrar venta</button></div></td></tr>') + '</tbody></table></div></section>' +
      '<p class="muted-note section-spacer">Las ventas se guardan localmente en esta demostración. La emisión electrónica DIAN requiere configurar un proveedor tecnológico.</p>';
  }

  function renderPurchases() {
    var rows = state.purchases.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).map(function (item) {
      return '<tr><td><strong>' + esc(item.number) + '</strong><small>' + dateLabel(item.date) + '</small></td><td><strong>' + esc(item.supplier) + '</strong><small>' + esc(item.detail) + '</small></td><td><strong>' + money(item.total) + '</strong></td><td>' + statusBadge(item.status) + '</td><td><button class="button-quiet" data-action="purchase-detail" data-id="' + esc(item.id) + '">Ver</button></td></tr>';
    }).join("");
    return heading("TU NEGOCIO", "Compras", "Recibe materiales, registra facturas de proveedor y controla lo que queda por pagar.", '<button class="button button-primary" data-action="new-purchase"><span>＋</span> Registrar compra</button>') +
      '<div class="metric-grid">' + metricCard("Órdenes registradas", String(state.purchases.length), "Compras en el sistema", "↙", false) + metricCard("Por recibir", String(state.purchases.filter(function (item) { return item.status === "Por recibir"; }).length), "Revisa las entregas pendientes", "▦", true) + metricCard("Proveedores", String(state.contacts.filter(function (item) { return item.role.indexOf("Proveedor") >= 0; }).length), "En tu lista de contactos", "♙", false) + metricCard("Compras recibidas", money(state.purchases.filter(function (item) { return item.status === "Recibida" || item.status === "Pagada"; }).reduce(function (sum, item) { return sum + item.total; }, 0)), "Según registros de compra", "$", false) + '</div>' +
      '<section class="panel list-panel"><div class="panel-header"><div><h2>Compras recientes</h2><p>Órdenes y recepciones de tus proveedores.</p></div></div><div class="table-wrap"><table><thead><tr><th>ORDEN</th><th>PROVEEDOR / DETALLE</th><th>VALOR</th><th>ESTADO</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">↙</div><strong>Aún no tienes compras</strong><p>Primero agrega un proveedor y una materia prima o insumo.</p><button class="button button-secondary" data-page="contacts">Agregar proveedor</button> <button class="button button-primary" data-action="new-product">Agregar producto</button></div></td></tr>') + '</tbody></table></div></section>';
  }

  function renderInventory() {
    var rows = state.inventory.map(function (item) {
      var low = item.stock <= item.min;
      return '<tr><td><strong>' + esc(item.name) + '</strong><small>' + esc(item.sku) + '</small></td><td>' + esc(item.type) + '</td><td><strong>' + num(item.stock, 1) + ' ' + esc(item.unit) + '</strong></td><td>' + num(item.min, 1) + ' ' + esc(item.unit) + '</td><td>' + money(item.cost) + '</td><td>' + (low ? '<span class="status pending">Stock bajo</span>' : '<span class="status">Disponible</span>') + '</td></tr>';
    }).join("");
    var value = state.inventory.reduce(function (sum, item) { return sum + item.stock * item.cost; }, 0);
    return heading("TU NEGOCIO", "Inventario", "Mira qué tienes disponible y qué necesitas volver a pedir.", '<button class="button button-secondary" data-action="inventory-export">↓ Exportar</button>' + (state.inventory.length ? '<button class="button button-secondary" data-action="new-adjustment">Ajustar stock</button>' : '') + '<button class="button button-primary" data-action="new-product"><span>＋</span> Agregar producto</button>') +
      '<div class="metric-grid">' + metricCard("Referencias", String(state.inventory.length), "Productos, materias primas e insumos", "▦", false) + metricCard("Valor aproximado", money(value), "Según el costo registrado", "$", false) + metricCard("Por reponer", String(state.inventory.filter(function (item) { return item.stock <= item.min; }).length), "Referencias bajo el mínimo", "!", true) + metricCard("Bodegas", "Por configurar", "Se define al iniciar la empresa", "⌂", false) + '</div>' +
      '<div class="toolbar"><div class="toolbar-left"><label class="search-field"><span>⌕</span><input type="search" placeholder="Buscar producto o código" data-filter="inventory"></label><select class="filter-select" id="inventory-type"><option value="Todos">Todos los tipos</option><option>Producto terminado</option><option>Materia prima</option><option>Insumo</option></select></div></div>' +
      '<section class="panel list-panel"><div class="table-wrap"><table><thead><tr><th>PRODUCTO</th><th>TIPO</th><th>EXISTENCIA</th><th>MÍNIMO</th><th>COSTO UNITARIO</th><th>ESTADO</th></tr></thead><tbody id="inventory-rows">' + (rows || '<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">▦</div><strong>Tu inventario está vacío</strong><p>Agrega materias primas e insumos primero. Después podrás crear productos terminados y registrar producción.</p><button class="button button-primary" data-action="new-product">Agregar primer producto</button></div></td></tr>') + '</tbody></table></div></section>';
  }

  function renderProduction() {
    var rows = state.production.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).map(function (order) {
      return '<tr><td><strong>' + esc(order.number) + '</strong><small>' + dateLabel(order.date) + '</small></td><td><strong>' + esc(order.product) + '</strong></td><td>' + num(order.quantity) + ' und.</td><td>' + (order.wasteKg ? num(order.wasteKg, 1) + ' kg' : "—") + '</td><td>' + statusBadge(order.status) + '</td><td><button class="button-quiet" data-action="production-detail" data-id="' + esc(order.id) + '">Ver</button>' + (order.status === "En proceso" ? ' <button class="button-quiet" data-action="production-complete" data-id="' + esc(order.id) + '">Terminar</button>' : "") + '</td></tr>';
    }).join("");
    var active = state.production.filter(function (item) { return item.status === "En proceso"; }).length;
    return heading("TU NEGOCIO", "Producción", "Organiza lo que vas a fabricar y registra lo que realmente usaste.", '<button class="button button-primary" data-action="new-production"><span>＋</span> Nueva orden</button>') +
      '<div class="metric-grid">' + metricCard("Órdenes activas", String(active).padStart(2, "0"), "En proceso", "⚙", false) + metricCard("Terminadas este mes", String(state.production.filter(function (item) { return item.status === "Terminada" && item.date.slice(0, 7) === currentPeriod; }).length), "Listas para entregar", "✓", false) + metricCard("Unidades producidas", num(currentEnvironment().productionUnits), "En el período seleccionado", "▦", false) + metricCard("Desperdicio registrado", num(state.production.filter(function (item) { return item.date.slice(0, 7) === currentPeriod; }).reduce(function (sum, item) { return sum + (item.wasteKg || 0); }, 0), 1) + " kg", "Ayuda a reducir pérdidas", "♧", true) + '</div>' +
      '<section class="panel list-panel"><div class="panel-header"><div><h2>Órdenes de producción</h2><p>Consumos, cantidades terminadas y desperdicio.</p></div><button class="panel-link" data-page="inventory">Ver materiales →</button></div><div class="table-wrap"><table><thead><tr><th>ORDEN</th><th>PRODUCTO</th><th>CANTIDAD</th><th>DESPERDICIO</th><th>ESTADO</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="6"><div class="empty-state"><strong>Todavía no hay órdenes</strong><p>Agrega materias primas y un producto terminado antes de iniciar producción.</p><button class="button button-primary" data-action="new-product">Agregar producto</button></div></td></tr>') + '</tbody></table></div></section>';
  }

  function renderEnvironment() {
    var record = currentEnvironment();
    var periodRecorded = state.environment.some(function (item) { return item.period === currentPeriod; });
    var totalWaste = wasteTotal(record);
    var emissions = estimateEmissions(record);
    var rate = totalWaste ? Math.round(record.recycledKg / totalWaste * 100) : 0;
    var energyTrend = environmentTrend(record, "electricityKwh");
    var waterTrend = environmentTrend(record, "waterM3");
    var periods = state.environment.slice().sort(function (a, b) { return b.period.localeCompare(a.period); });
    if (!periods.some(function (item) { return item.period === currentPeriod; })) periods.unshift({ period: currentPeriod });
    var options = periods.map(function (item) { return '<option value="' + esc(item.period) + '"' + (item.period === currentPeriod ? " selected" : "") + '>' + monthName(item.period) + " " + item.period.slice(0, 4) + '</option>'; }).join("");
    return heading("PRODUCE MEJOR, PASO A PASO", "Impacto ambiental", "Entiende tus consumos y encuentra oportunidades para producir mejor.", '<select class="filter-select" id="environment-period">' + options + '</select><button class="button button-primary" data-action="new-environment"><span>＋</span> Registrar datos</button>') +
      '<div class="env-highlight"><div class="env-leaf">♧</div><div class="env-highlight-main"><div class="eyebrow">RESUMEN DE ' + monthName(currentPeriod).toUpperCase() + '</div><h2>' + (periodRecorded ? "Cada dato cuenta. Revisa tu avance." : "Aún no hay datos ambientales del mes.") + '</h2><p>' + (periodRecorded ? "Compara tus consumos con tu propia producción y mejora período a período." : "Sube la factura de energía o agua, o prueba con un recibo de ejemplo.") + '</p></div><button class="button" data-action="environment-export">↓ Descargar resumen</button></div>' +
      '<div class="env-grid">' + envMetric("Energía", num(record.electricityKwh) + " kWh", "Consumo de la sede", "ϟ") + envMetric("Agua", num(record.waterM3, 1) + " m³", "Agua consumida", "◌") + envMetric("Emisiones estimadas", num(emissions / 1000, 2) + " tCO₂e", "Cálculo demostrativo", "♧") + envMetric("Residuos aprovechados", rate + "%", num(record.recycledKg, 1) + " kg reutilizados o reciclados", "↻") + '</div>' +
      publicBenchmarkPanel() +
      '<div class="env-layout"><div class="panel"><div class="panel-header"><div><h2>Consumo y producción</h2><p>Registra el dato de tu factura y compáralo con lo que produces.</p></div><span class="status neutral">' + (record.electricityKwh && record.waterM3 ? "Datos registrados" : "Datos incompletos") + '</span></div><div class="panel-body"><div class="table-wrap"><table><thead><tr><th>INDICADOR</th><th>VALOR DEL MES</th><th>POR UNIDAD</th><th>COMPARACIÓN</th></tr></thead><tbody>' +
      '<tr><td><strong>Energía</strong><small>Electricidad comprada</small></td><td>' + num(record.electricityKwh) + ' kWh' + sourceLabel(record, "energy") + '</td><td>' + (record.productionUnits ? num(record.electricityKwh / record.productionUnits, 2) : "—") + ' kWh / unidad</td><td>' + trendBadge(energyTrend) + '</td></tr>' +
      '<tr><td><strong>Agua</strong><small>Consumo de la sede</small></td><td>' + num(record.waterM3, 1) + ' m³' + sourceLabel(record, "water") + '</td><td>' + (record.productionUnits ? num(record.waterM3 / record.productionUnits, 3) : "—") + ' m³ / unidad</td><td>' + trendBadge(waterTrend) + '</td></tr>' +
      '<tr><td><strong>Combustibles</strong><small>Uso reportado</small></td><td>' + num(record.fuelL, 1) + ' L</td><td>' + (record.productionUnits ? num(record.fuelL / record.productionUnits, 3) : "—") + ' L / unidad</td><td><span class="status neutral">Dato manual</span></td></tr>' +
      '<tr><td><strong>Residuos</strong><small>Todos los tipos</small></td><td>' + num(totalWaste, 1) + ' kg</td><td>' + (record.productionUnits ? num(totalWaste / record.productionUnits, 3) : "—") + ' kg / unidad</td><td><span class="status">' + num(record.recycledKg, 1) + ' kg aprovechados</span></td></tr></tbody></table></div>' +
      '<section class="env-targets"><div class="env-target-heading"><div><h3>Metas propias de mejora</h3><p>Elige cuánto quieres reducir por unidad producida. Se calcula con tus tres meses anteriores con datos.</p></div><button class="button button-secondary" data-action="environment-set-target">' + (state.environmentTargets.energyReductionPct != null || state.environmentTargets.waterReductionPct != null ? "Ajustar metas" : "Definir metas") + '</button></div><div class="env-target-grid">' + renderEnvironmentTarget("Energía", "energyReductionPct", "electricityKwh", "kWh", 2) + renderEnvironmentTarget("Agua", "waterReductionPct", "waterM3", "m³", 3) + '</div><p class="form-note">Son objetivos elegidos por tu empresa, no límites universales ni requisitos ambientales.</p></section>' +
      '<p class="muted-note section-spacer">Las emisiones son estimaciones ilustrativas. Configura factores oficiales con tu asesor antes de usarlas para reportes formales.</p></div></div>' +
      '<div class="panel"><div class="panel-header"><div><h2>Ideas para este mes</h2><p>Recomendaciones basadas en tus registros.</p></div></div><div class="panel-body">' +
      (energyTrend.change > 10 ? recommendation("ϟ", "Revisa el consumo de energía", "El consumo por unidad subió " + energyTrend.change + "% frente a tu referencia reciente. Revisa horarios de equipos y fugas de aire.", false) : recommendation("ϟ", energyTrend.ready ? "Sigue comparando tu energía" : "Estamos creando tu referencia", energyTrend.ready ? "Tu consumo por unidad se compara con tus propios meses anteriores." : "Registra energía y unidades producidas durante dos meses para ver una comparación propia.", true)) +
      recommendation("↻", "Registra lo que aprovechas", "Anota los kg reutilizados o reciclados y guarda el soporte de entrega al gestor.", true) +
      recommendation("◌", waterTrend.ready ? "Compara el agua por unidad" : "Registra también el agua", waterTrend.ready ? "Revisa si el consumo por unidad cambia frente a tus propios meses anteriores." : "Con dos meses de consumos y producción podremos mostrar una referencia de tu empresa.", true) +
      '<div class="divider"></div><strong style="font-size:9px;color:#52645a">Datos del período</strong><div class="progress-line"><span style="width:' + (record.electricityKwh && record.waterM3 && totalWaste ? "80" : "45") + '%"></span></div><div class="progress-caption"><span>Consumos registrados</span><span>' + (record.electricityKwh && record.waterM3 && totalWaste ? "3 de 4 datos" : "2 de 4 datos") + '</span></div></div></div></div>';
  }

  /* Referencia pública ambiental */
  function readPublicBenchmarkCache() {
    try {
      var cached = JSON.parse(localStorage.getItem(PUBLIC_BENCHMARK_CACHE_KEY) || "null");
      return cached && cached.data && Array.isArray(cached.data.observations) ? cached : null;
    } catch (error) {
      return null;
    }
  }

  function loadPublicBenchmark(force) {
    if (window.location.protocol === "file:") {
      publicBenchmarkState.status = "file";
      if (currentPage === "environment") render();
      return;
    }
    if (publicBenchmarkState.status === "loading") return;
    var cached = readPublicBenchmarkCache();
    if (cached && !publicBenchmarkState.data) {
      publicBenchmarkState.data = cached.data;
      publicBenchmarkState.cachedAt = cached.cachedAt || "";
      publicBenchmarkState.status = cached.data.stale ? "stale" : "ready";
    }
    if (!force && cached && cached.data && !cached.data.stale && cached.cachedAt && Date.now() - new Date(cached.cachedAt).getTime() < 24 * 60 * 60 * 1000) {
      if (currentPage === "environment") render();
      return;
    }
    publicBenchmarkState.status = "loading";
    publicBenchmarkState.error = "";
    if (currentPage === "environment") render();
    fetch("/api/v1/environment/public-benchmark", { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" })
      .then(function (response) {
        return response.json().then(function (payload) {
          if (!response.ok) throw new Error(payload.error || "La referencia no está disponible.");
          return payload;
        });
      })
      .then(function (payload) {
        var observations = (payload.observations || []).filter(function (item) {
          return (String(item.areaCode) === "1" || String(item.areaCode) === "170") && Number.isFinite(Number(item.year)) && Number.isFinite(Number(item.value));
        });
        if (!observations.length) throw new Error("La ONU no publicó datos disponibles para las áreas solicitadas.");
        payload.observations = observations;
        publicBenchmarkState.data = payload;
        publicBenchmarkState.cachedAt = new Date().toISOString();
        publicBenchmarkState.status = payload.stale ? "stale" : "ready";
        try { localStorage.setItem(PUBLIC_BENCHMARK_CACHE_KEY, JSON.stringify({ data: payload, cachedAt: publicBenchmarkState.cachedAt })); } catch (error) { /* La consulta sigue disponible aunque el navegador no guarde la caché. */ }
        if (currentPage === "environment") render();
      })
      .catch(function (error) {
        var lastCache = readPublicBenchmarkCache();
        if (lastCache && lastCache.data) {
          publicBenchmarkState.data = lastCache.data;
          publicBenchmarkState.cachedAt = lastCache.cachedAt || "";
          publicBenchmarkState.status = "stale";
        } else {
          publicBenchmarkState.status = "unavailable";
          publicBenchmarkState.data = null;
        }
        publicBenchmarkState.error = error.message || "No se pudo consultar la referencia pública.";
        if (currentPage === "environment") render();
      });
  }

  function benchmarkAgeLabel(data) {
    var date = data && data.fetchedAt ? new Date(data.fetchedAt) : null;
    if (!date || Number.isNaN(date.getTime())) return "fecha de consulta no disponible";
    return "consulta del " + new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function renderBenchmarkChart(observations) {
    var areas = [
      { code: "1", label: "Mundo", color: "#31805a" },
      { code: "170", label: "Colombia", color: "#5287c8" }
    ];
    var series = areas.map(function (area) {
      return { area: area, rows: observations.filter(function (item) { return String(item.areaCode) === area.code; }).sort(function (a, b) { return Number(a.year) - Number(b.year); }).slice(-10) };
    }).filter(function (item) { return item.rows.length; });
    if (!series.length) return '<p class="form-note">Todavía no hay datos publicados para mostrar.</p>';
    var allRows = [].concat.apply([], series.map(function (item) { return item.rows; }));
    var years = allRows.map(function (item) { return Number(item.year); });
    var values = allRows.map(function (item) { return Number(item.value); });
    var minYear = Math.min.apply(null, years); var maxYear = Math.max.apply(null, years);
    var minValue = Math.min.apply(null, values); var maxValue = Math.max.apply(null, values);
    if (minValue === maxValue) { minValue -= 1; maxValue += 1; }
    var pad = (maxValue - minValue) * 0.12; minValue -= pad; maxValue += pad;
    var width = 560; var height = 150; var left = 15; var right = 15; var top = 12; var bottom = 22;
    var paths = series.map(function (item) {
      var points = item.rows.map(function (row) {
        var x = minYear === maxYear ? width / 2 : left + ((Number(row.year) - minYear) / (maxYear - minYear)) * (width - left - right);
        var y = top + ((maxValue - Number(row.value)) / (maxValue - minValue)) * (height - top - bottom);
        return { x: x, y: y };
      });
      return '<polyline fill="none" stroke="' + item.area.color + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="' + points.map(function (point) { return point.x.toFixed(1) + "," + point.y.toFixed(1); }).join(" ") + '" aria-label="' + item.area.label + '" />' + points.map(function (point, index) { return '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="3" fill="' + item.area.color + '"><title>' + item.area.label + ' · ' + item.rows[index].year + ': ' + num(item.rows[index].value, 3) + '</title></circle>'; }).join("");
    }).join("");
    return '<div class="benchmark-chart"><svg viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Evolución anual de intensidad energética agregada para las áreas disponibles"><line x1="' + left + '" y1="' + (height - bottom) + '" x2="' + (width - right) + '" y2="' + (height - bottom) + '" class="benchmark-axis" />' + paths + '<text x="' + left + '" y="' + (height - 3) + '" class="benchmark-year">' + minYear + '</text><text x="' + (width - right) + '" y="' + (height - 3) + '" text-anchor="end" class="benchmark-year">' + maxYear + '</text></svg><div class="benchmark-legend">' + series.map(function (item) { return '<span><i style="--series-color:' + item.area.color + '"></i>' + item.area.label + '</span>'; }).join("") + '</div></div>';
  }

  function publicBenchmarkPanel() {
    var status = publicBenchmarkState.status;
    var data = publicBenchmarkState.data;
    if (!data) {
      var message = status === "file" ? "Esta pestaña se abrió como archivo local. Inicia Pyme360 con el lanzador de tu sistema; así se habilitan la consulta ONU y el lector de recibos." : status === "loading" ? "Consultando la serie pública de la ONU…" : status === "unavailable" ? "La referencia no está disponible en este momento. Tus registros de consumo siguen guardados." : "La referencia pública aparecerá aquí cuando se consulte.";
      return '<section class="panel public-benchmark"><div class="panel-header"><div><span class="status neutral">ODS 7.3.1 · ONU</span><h2>Contexto energético global y de Colombia</h2><p>' + message + '</p></div><button class="button button-secondary" data-action="environment-retry-reference"' + (status === "loading" || status === "file" ? ' disabled' : '') + '>Reintentar</button></div>' + (publicBenchmarkState.error ? '<p class="benchmark-error">' + esc(publicBenchmarkState.error) + '</p>' : '') + '<div class="public-benchmark-note">Este indicador anual mide energía primaria por PIB. No es un consumo objetivo para una fábrica ni se compara directamente con kWh por unidad producida.</div></section>';
    }
    var latest = {};
    data.observations.forEach(function (item) {
      var code = String(item.areaCode);
      if ((code === "1" || code === "170") && (!latest[code] || Number(item.year) > Number(latest[code].year))) latest[code] = item;
    });
    var cards = [{ code: "1", label: "Mundo" }, { code: "170", label: "Colombia" }].map(function (area) {
      var item = latest[area.code];
      return '<div class="benchmark-stat"><span>' + area.label + '</span>' + (item ? '<strong>' + num(item.value, 3) + '</strong><small>' + item.year + ' · ' + area.label + '</small>' : '<strong>Sin dato publicado</strong><small>La serie no incluye un valor reciente</small>') + '</div>';
    }).join("");
    var isStale = status === "stale" || data.stale;
    var isLoading = status === "loading";
    return '<section class="panel public-benchmark"><div class="panel-header"><div><span class="status ' + (isStale ? "pending" : "neutral") + '">ODS 7.3.1 · ' + (isLoading ? "Actualizando…" : isStale ? "Referencia guardada" : "Datos públicos") + '</span><h2>Contexto energético global y de Colombia</h2><p>Intensidad energética nacional: energía primaria suministrada por unidad de PIB. Datos anuales agregados.</p></div><button class="button button-secondary" data-action="environment-retry-reference"' + (isLoading ? ' disabled' : '') + '>' + (isLoading ? "Consultando…" : "Actualizar") + '</button></div>' +
      '<div class="benchmark-body"><div class="benchmark-stats">' + cards + '</div>' + renderBenchmarkChart(data.observations) + '</div>' +
      '<div class="public-benchmark-note"><strong>Unidad:</strong> ' + esc(data.unit || "MJ por unidad de PIB en PPA constante, según base publicada") + '. Este contexto no es una meta para tu fábrica ni se compara directamente con kWh por unidad producida. ' + (isStale ? 'Se muestra una respuesta guardada; ' : '') + esc(benchmarkAgeLabel(data)) + '. <strong>Fuente:</strong> ' + esc(data.source || "ONU · Base mundial de indicadores ODS") + '. <a href="' + esc(data.metadataUrl || "https://unstats.un.org/sdgs/metadata/?Goal=7&Target=7.3") + '" target="_blank" rel="noopener noreferrer">Ver metodología ONU</a>. ' + (data.sourceUrl ? '<a href="' + esc(data.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Fuente de datos</a>.' : '') + '</div>' + (publicBenchmarkState.error ? '<p class="benchmark-error">' + esc(publicBenchmarkState.error) + '</p>' : '') + '</section>';
  }

  function environmentTargetBaseline(field) {
    var byPeriod = {};
    state.environment.forEach(function (item) {
      var consumption = Number(item[field]);
      var production = Number(item.productionUnits);
      if (item.period < currentPeriod && production > 0 && environmentHasReading(item, field) && Number.isFinite(consumption) && consumption >= 0) byPeriod[item.period] = consumption / production;
    });
    var periods = Object.keys(byPeriod).sort().slice(-3);
    var values = periods.map(function (period) { return byPeriod[period]; });
    return { periods: periods, average: values.length === 3 ? values.reduce(function (sum, value) { return sum + value; }, 0) / 3 : null };
  }

  function renderEnvironmentTarget(label, goalKey, field, unit, digits) {
    var percent = state.environmentTargets[goalKey];
    var baseline = environmentTargetBaseline(field);
    var target = percent != null && baseline.average != null ? baseline.average * (1 - Number(percent) / 100) : null;
    var hasCurrentRecord = state.environment.some(function (item) { return item.period === currentPeriod; });
    var current = currentEnvironment();
    var hasActual = hasCurrentRecord && Number(current.productionUnits) > 0 && environmentHasReading(current, field) && Number.isFinite(Number(current[field]));
    var actual = hasActual ? Number(current[field]) / Number(current.productionUnits) : null;
    var status = target == null ? "Sin referencia" : !hasActual ? "Falta dato del período" : actual <= target ? "Dentro de tu meta" : "Por encima de tu meta";
    var details = percent == null ? "Elige un porcentaje de mejora para crear una meta propia." : baseline.average == null ? "Necesitas tres meses anteriores con consumo y unidades producidas para calcular la referencia." : "Promedio de " + baseline.periods.map(function (period) { return monthName(period) + " " + period.slice(0, 4); }).join(", ") + ".";
    return '<article class="env-target-card"><div class="env-target-card-top"><strong>' + label + '</strong><span class="status neutral">' + status + '</span></div>' +
      (target == null ? '<p class="env-target-value">Meta pendiente</p>' : '<p class="env-target-value">' + num(target, digits) + ' ' + unit + '<small> por unidad · ' + num(percent) + '% menos que la referencia</small></p>') +
      '<p>' + details + '</p>' + (hasActual && target != null ? '<small class="env-target-actual">Este período: ' + num(actual, digits) + ' ' + unit + ' por unidad.</small>' : '') + '</article>';
  }

  function environmentHasReading(record, field) {
    var key = field === "electricityKwh" ? "energy" : "water";
    var source = record && record.readingSources && record.readingSources[key];
    var legacySource = record && record[(key === "energy" ? "energy" : "water") + "Source"];
    return Boolean(source || legacySource || Number(record && record[field]) > 0);
  }

  function environmentTrend(record, field) {
    var current = Number(record[field]) || 0;
    var currentIntensity = record.productionUnits > 0 ? current / record.productionUnits : 0;
    var history = state.environment.filter(function (item) {
      return item.period < currentPeriod && Number(item.productionUnits) > 0 && Number(item[field]) > 0;
    }).sort(function (a, b) { return a.period.localeCompare(b.period); }).slice(-3);
    var rates = history.map(function (item) { return Number(item[field]) / Number(item.productionUnits); });
    var reference = rates.length ? rates.reduce(function (sum, value) { return sum + value; }, 0) / rates.length : 0;
    var ready = rates.length >= 2 && current > 0 && currentIntensity > 0;
    var change = ready && reference ? Math.round((currentIntensity - reference) / reference * 100) : 0;
    return { ready: ready, change: change, intensity: currentIntensity, reference: reference, months: rates.length };
  }

  function trendBadge(trend) {
    if (!trend.ready) return '<span class="status neutral" title="Se necesitan dos meses anteriores con consumo y producción">Sin referencia suficiente</span>';
    var cls = trend.change > 10 ? "pending" : "";
    var sign = trend.change > 0 ? "+" : "";
    return '<span class="status ' + cls + '" title="Promedio propio: ' + num(trend.reference, 3) + ' por unidad en ' + trend.months + ' períodos anteriores con datos">' + sign + trend.change + '% vs. tus períodos anteriores</span>';
  }

  function sourceLabel(record, key) {
    var flatPrefix = key === "energy" ? "energy" : "water";
    var source = record.readingSources && record.readingSources[key];
    if (!source && record[flatPrefix + "Source"]) source = { label: record[flatPrefix + "Source"] };
    return source ? '<small class="reading-source">' + esc(source.label || "Dato confirmado") + '</small>' : "";
  }

  function envMetric(label, value, foot, icon) {
    return '<div class="env-metric"><div class="env-metric-top"><span>' + label + '</span><span class="env-metric-icon">' + icon + '</span></div><strong>' + value + '</strong><small>' + foot + '</small></div>';
  }

  function recommendation(icon, title, detail, green) {
    return '<div class="recommendation"><span class="recommendation-icon' + (green ? " green" : "") + '">' + icon + '</span><div><strong>' + title + '</strong><p>' + detail + '</p></div></div>';
  }

  /* Finanzas, contactos y datos */
  function renderFinance() {
    var due = state.sales.filter(function (sale) { return sale.status === "Pendiente de pago"; }).reduce(function (sum, sale) { return sum + sale.total; }, 0);
    var payable = state.purchases.filter(function (purchase) { return purchase.status === "Por recibir"; }).reduce(function (sum, purchase) { return sum + purchase.total; }, 0);
    var income = state.sales.filter(function (sale) { return sale.date.slice(0, 7) === currentPeriod; }).reduce(function (sum, sale) { return sum + sale.total; }, 0);
    var rows = state.sales.slice(0, 8).map(function (sale) {
      return '<tr><td><strong>' + esc(sale.number) + '</strong><small>' + dateLabel(sale.date) + '</small></td><td>' + esc(sale.customer) + '</td><td><strong>' + money(sale.total) + '</strong></td><td>' + statusBadge(sale.status) + '</td></tr>';
    }).join("");
    return heading("TU NEGOCIO", "Finanzas", "Consulta lo que has vendido, lo que falta por cobrar y tus compromisos de compra.", '<button class="button button-secondary" data-action="finance-export">↓ Exportar movimientos</button><button class="button button-primary" data-action="new-payment"><span>＋</span> Registrar pago</button>') +
      '<div class="finance-cards"><div class="finance-card"><span>Ingresos registrados este mes</span><strong>' + money(income) + '</strong><small>Basado en ventas registradas</small></div><div class="finance-card"><span>Por cobrar a clientes</span><strong>' + money(due) + '</strong><small>Facturas pendientes de pago</small></div><div class="finance-card"><span>Compromisos de compra</span><strong>' + money(payable) + '</strong><small>Órdenes pendientes de recibir</small></div></div>' +
      '<section class="panel list-panel"><div class="panel-header"><div><h2>Movimientos recientes</h2><p>Resumen de ventas registradas. El contador puede revisar el detalle contable.</p></div><span class="status neutral">Resumen administrativo</span></div><div class="table-wrap"><table><thead><tr><th>DOCUMENTO</th><th>CONTACTO</th><th>VALOR</th><th>ESTADO</th></tr></thead><tbody>' + (rows || '<tr><td colspan="4"><div class="empty-state"><strong>Aún no hay movimientos</strong><p>Cuando registres ventas, aparecerán aquí para facilitar la revisión.</p><button class="button button-primary" data-action="new-sale">Registrar primera venta</button></div></td></tr>') + '</tbody></table></div></section>' +
      '<div class="notice section-spacer"><span class="notice-icon">i</span><span>Este resumen sirve para el control del negocio. No reemplaza los libros ni las declaraciones preparados o revisados por tu contador.</span></div>';
  }

  function renderContacts() {
    var rows = state.contacts.map(function (item) {
      var initials = item.name.split(/\s+/).slice(0, 2).map(function (part) { return part.charAt(0); }).join("").toUpperCase();
      return '<tr><td><div class="contact-cell"><span class="contact-avatar">' + esc(initials) + '</span><span><strong>' + esc(item.name) + '</strong><small>' + esc(item.idNumber || "Identificación pendiente") + '</small></span></div></td><td>' + statusBadge(item.role, "neutral") + '</td><td>' + esc(item.email || "—") + '</td><td>' + esc(item.phone || "—") + '</td><td><button class="button-quiet" data-action="contact-detail" data-id="' + esc(item.id) + '">Ver</button></td></tr>';
    }).join("");
    return heading("TU NEGOCIO", "Contactos", "Ten a mano los datos de tus clientes y proveedores.", '<button class="button button-primary" data-action="new-contact"><span>＋</span> Nuevo contacto</button>') +
      '<div class="toolbar"><div class="toolbar-left"><label class="search-field"><span>⌕</span><input type="search" placeholder="Buscar por nombre o identificación" data-filter="contacts"></label><select class="filter-select" id="contact-role"><option value="Todos">Todos los contactos</option><option>Cliente</option><option>Proveedor</option></select></div><span class="muted-note">' + state.contacts.length + ' contactos</span></div>' +
      '<section class="panel list-panel"><div class="table-wrap"><table><thead><tr><th>CONTACTO</th><th>TIPO</th><th>CORREO</th><th>TELÉFONO</th><th></th></tr></thead><tbody id="contact-rows">' + (rows || '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">♙</div><strong>Aún no tienes contactos</strong><p>Agrega tus propios clientes y proveedores. Esta lista es exclusiva de los datos guardados en este navegador.</p><button class="button button-primary" data-action="new-contact">Agregar primer contacto</button></div></td></tr>') + '</tbody></table></div></section>';
  }

  function renderData() {
    var total = state.contacts.length + state.inventory.length + state.sales.length + state.purchases.length + state.production.length + state.environment.length;
    var body = '<div class="excel-actions-grid">' +
      '<section class="panel excel-action-card"><div class="excel-action-icon">↓</div><h2>Descargar Excel maestro</h2><p>Un solo archivo con los datos de tu empresa, separados por hojas. Se descarga cuando tú lo pides.</p><button class="button button-primary" data-action="excel-download-master">Descargar Excel maestro</button></section>' +
      '<section class="panel excel-action-card"><div class="excel-action-icon">▤</div><h2>Descargar plantilla vacía</h2><p>Usa los mismos encabezados del Excel maestro para organizar información nueva.</p><button class="button button-secondary" data-action="excel-download-template">Descargar plantilla vacía</button></section>' +
      '<section class="panel excel-action-card"><div class="excel-action-icon">↑</div><h2>Importar Excel de la empresa</h2><p>Selecciona un archivo, relaciona sus columnas y revisa los cambios antes de guardarlos.</p><button class="button button-secondary" data-action="excel-select-file">Elegir archivo Excel</button><input class="visually-hidden" type="file" id="excel-import-file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"></section>' +
      '</div><div class="notice section-spacer"><span class="notice-icon">i</span><span>Los archivos se leen y descargan en este navegador. No se envían a un servidor. Tus registros actuales permanecen en el dispositivo.</span></div>' +
      '<section class="panel section-spacer"><div class="panel-header"><div><h2>Qué incluye el Excel</h2><p>' + total + ' registros principales guardados en esta demostración.</p></div></div><div class="panel-body"><div class="excel-sheet-list"><span>Empresa</span><span>Contactos</span><span>Productos</span><span>Recetas</span><span>Ventas y detalle</span><span>Compras</span><span>Producción y consumos</span><span>Impacto ambiental</span><span>Datos adicionales</span></div><p class="form-note">La plantilla incluye los encabezados aunque todavía no tengas registros. Los resúmenes y la actividad reciente se calculan dentro de la aplicación y no se exportan como datos fuente.</p></div></section>';
    if (importSession) body += renderImportWizard();
    return heading("TUS DATOS", "Datos y Excel", "Descarga una copia de trabajo o trae los datos que ya tienes en una hoja de cálculo.", "") + body;
  }

  /* Importación Excel: interfaz de revisión */
  function renderImportWizard() {
    var analysis = buildImportAnalysis();
    var readyCount = analysis.valid.length + analysis.details.filter(function (item) { return item.valid && !item.duplicate; }).length + analysis.extras.length;
    var entityOptions = importEntityOptions();
    var mappingCards = importSession.sheets.map(function (sheet, sheetIndex) {
      var config = sheet.config;
      var rowOptions = sheet.rows.slice(0, Math.min(10, sheet.rows.length)).map(function (row, index) {
        var title = row.slice(0, 4).map(function (cell) { return String(cell == null ? "" : cell).trim(); }).filter(Boolean).join(" · ");
        return '<option value="' + index + '"' + (index === config.headerRow ? " selected" : "") + '>Fila ' + (index + 1) + (title ? ": " + esc(title.slice(0, 70)) : "") + '</option>';
      }).join("");
      var fields = config.entity && config.entity !== "ignore" ? importFields(config.entity) : [];
      var header = sheet.rows[config.headerRow] || [];
      var fieldControls = fields.map(function (field) {
        var selected = config.mapping[field.key] == null ? "" : String(config.mapping[field.key]);
        var columnOptions = '<option value="">No importar</option>' + header.map(function (cell, columnIndex) {
          var label = String(cell == null || cell === "" ? "Columna " + (columnIndex + 1) : cell);
          return '<option value="' + columnIndex + '"' + (selected === String(columnIndex) ? " selected" : "") + '>' + esc(label) + '</option>';
        }).join("");
        return '<label class="excel-map-field"><span>' + esc(field.label) + (field.required ? ' <b>*</b>' : '') + '</span><select data-excel-map-field="' + esc(field.key) + '" data-excel-sheet="' + sheetIndex + '">' + columnOptions + '</select></label>';
      }).join("");
      var sample = sheet.rows.slice(config.headerRow + 1, config.headerRow + 3).map(function (row) {
        return '<tr>' + header.slice(0, 5).map(function (_, col) { return '<td>' + esc(row[col] == null ? "" : row[col]) + '</td>'; }).join("") + '</tr>';
      }).join("");
      return '<details class="excel-sheet-card" ' + (sheetIndex === importSession.openSheet ? "open" : "") + '><summary><strong>' + esc(sheet.name) + '</strong><span>' + (config.entity === "ignore" ? "No se importará" : esc(importEntityLabel(config.entity))) + '</span></summary><div class="excel-sheet-content"><div class="excel-config-row"><label>¿Qué tipo de datos contiene?<select data-excel-entity data-excel-sheet="' + sheetIndex + '">' + entityOptions.replace('value="' + esc(config.entity) + '"', 'value="' + esc(config.entity) + '" selected') + '</select></label><label>Fila de encabezados<select data-excel-header data-excel-sheet="' + sheetIndex + '">' + rowOptions + '</select></label></div>' +
        (fields.length ? '<div class="excel-map-grid">' + fieldControls + '</div>' : '<p class="form-note">Esta hoja no se usará para importar datos de Pyme360.</p>') +
        (sample ? '<div class="table-wrap excel-sample"><table><thead><tr>' + header.slice(0, 5).map(function (cell) { return '<th>' + esc(cell || "Columna") + '</th>'; }).join("") + '</tr></thead><tbody>' + sample + '</tbody></table></div>' : '') + '</div></details>';
    }).join("");
    var issues = analysis.issues.slice(0, 20).map(function (issue) {
      return '<tr><td>' + esc(issue.sheet) + ' · fila ' + issue.row + '</td><td>' + esc(issue.label) + '</td><td>' + esc(issue.reason) + '</td></tr>';
    }).join("");
    var duplicates = analysis.duplicates.slice(0, 10).map(function (candidate) {
      return '<li><strong>' + esc(candidate.label) + '</strong> · ' + esc(candidate.keyLabel) + '</li>';
    }).join("");
    var content = '<section class="panel excel-import-panel"><div class="panel-header"><div><h2>Revisar archivo: ' + esc(importSession.name) + '</h2><p>Relaciona cada hoja y confirma qué columnas corresponden a Pyme360.</p></div><button class="button-quiet" data-action="excel-cancel-import">Cancelar</button></div><div class="panel-body">' + mappingCards +
      '<div class="excel-summary-grid"><div><strong>' + readyCount + '</strong><span>Filas listas</span></div><div><strong>' + analysis.duplicates.length + '</strong><span>Duplicados</span></div><div><strong>' + analysis.issues.length + '</strong><span>Por revisar</span></div></div>' +
      (analysis.duplicates.length ? '<label class="excel-update-option"><input type="checkbox" id="excel-update-duplicates"' + (importSession.updateDuplicates ? " checked" : "") + '> Actualizar duplicados solo con los datos no vacíos del archivo</label><ul class="excel-duplicate-list">' + duplicates + (analysis.duplicates.length > 10 ? '<li>Y ' + (analysis.duplicates.length - 10) + ' más…</li>' : '') + '</ul>' : '') +
      (analysis.issues.length ? '<div class="table-wrap excel-issues"><table><thead><tr><th>UBICACIÓN</th><th>REGISTRO</th><th>QUÉ FALTA O NO COINCIDE</th></tr></thead><tbody>' + issues + '</tbody></table></div>' + (analysis.issues.length > 20 ? '<p class="form-note">Se muestran las primeras 20 filas por revisar. El resto también se conserva sin importar.</p>' : '') : '') +
      '<p class="form-note">Solo se guardarán las filas listas. Las referencias faltantes y los duplicados omitidos no se aplicarán. Los campos vacíos nunca borran información que ya exista.</p><div class="excel-import-footer"><button class="button button-secondary" data-action="excel-cancel-import">Cancelar</button><button class="button button-primary" data-action="excel-confirm-import"' + (!readyCount && !(analysis.duplicates.length && importSession.updateDuplicates) ? ' disabled' : '') + '>Confirmar e importar</button></div></div></section>';
    return content;
  }

  /* Importación Excel: esquema de campos */
  var IMPORT_ENTITIES = {
    ignore: "No importar",
    company: "Empresa",
    contacts: "Contactos",
    products: "Productos",
    recipes: "Recetas",
    sales: "Ventas",
    saleLines: "Detalle de ventas",
    purchases: "Compras",
    production: "Producción",
    productionInputs: "Consumos de producción",
    environment: "Impacto ambiental",
    extras: "Datos adicionales"
  };

  var IMPORT_FIELDS = {
    company: [
      fieldDef("company", "Nombre o razón social", true, ["nombre", "empresa", "razon social", "nombre o razon social", "company"]),
      fieldDef("companyNit", "NIT", false, ["nit", "identificacion tributaria"]),
      fieldDef("city", "Ciudad", false, ["ciudad", "municipio"]),
      fieldDef("activityType", "Actividad", false, ["actividad", "sector"])
    ],
    contacts: [
      fieldDef("id", "ID", false, ["id", "identificador"]), fieldDef("name", "Nombre", true, ["nombre", "razon social", "contacto", "cliente", "proveedor"]),
      fieldDef("role", "Tipo", true, ["tipo", "rol", "tipo de contacto", "clase"]), fieldDef("idNumber", "Identificación", false, ["nit", "cedula", "identificacion", "numero de documento"]),
      fieldDef("email", "Correo", false, ["correo", "email", "correo electronico"]), fieldDef("phone", "Teléfono", false, ["telefono", "celular", "telefono de contacto"])
    ],
    products: [
      fieldDef("id", "ID", false, ["id", "identificador"]), fieldDef("sku", "SKU / código", true, ["sku", "codigo", "referencia", "codigo de producto"]),
      fieldDef("name", "Nombre", true, ["nombre", "producto", "material", "descripcion"]), fieldDef("type", "Tipo", true, ["tipo", "tipo de producto", "clase"]),
      fieldDef("unit", "Unidad", true, ["unidad", "unidad de medida", "um"]), fieldDef("stock", "Existencia", false, ["existencia", "stock", "cantidad", "saldo"]),
      fieldDef("min", "Mínimo", false, ["minimo", "stock minimo"]), fieldDef("cost", "Costo unitario COP", false, ["costo", "costo unitario", "costo unitario cop", "valor unitario de compra"]),
      fieldDef("price", "Precio COP", false, ["precio", "precio cop", "precio de venta"]), fieldDef("taxType", "Tipo de IVA", false, ["tipo de iva", "iva", "impuesto"]), fieldDef("taxRate", "Tarifa IVA %", false, ["tarifa iva", "tarifa iva %", "porcentaje iva", "iva porcentaje"])
    ],
    recipes: [fieldDef("productSku", "Producto SKU", true, ["producto sku", "sku producto", "producto", "producto terminado"]), fieldDef("materialSku", "Material SKU", true, ["material sku", "sku material", "insumo sku", "materia prima sku"]), fieldDef("amount", "Cantidad por unidad", true, ["cantidad por unidad", "cantidad", "consumo unitario"])],
    sales: [
      fieldDef("id", "ID", false, ["id", "identificador"]), fieldDef("number", "Número", true, ["numero", "numero de factura", "factura", "documento", "consecutivo"]),
      fieldDef("customer", "Cliente", true, ["cliente", "comprador", "razon social cliente"]), fieldDef("date", "Fecha", true, ["fecha", "fecha de venta", "fecha factura"]),
      fieldDef("total", "Total COP", true, ["total", "valor total", "total cop", "valor"]), fieldDef("taxRate", "IVA %", false, ["iva", "iva porcentaje", "tarifa iva"]),
      fieldDef("status", "Estado", false, ["estado", "estado de pago"]), fieldDef("payment", "Forma de pago", false, ["forma de pago", "condicion de pago", "pago"]),
      fieldDef("paidDate", "Fecha de pago", false, ["fecha de pago", "fecha pago"]), fieldDef("method", "Medio de pago", false, ["medio de pago", "metodo de pago"])
    ],
    saleLines: [fieldDef("saleNumber", "Número de venta", true, ["numero de venta", "venta", "factura", "numero factura"]), fieldDef("sku", "Producto SKU", true, ["producto sku", "sku", "codigo", "referencia"]), fieldDef("quantity", "Cantidad", true, ["cantidad", "unidades"])],
    purchases: [
      fieldDef("id", "ID", false, ["id", "identificador"]), fieldDef("number", "Número", true, ["numero", "orden", "orden de compra", "factura proveedor", "documento"]),
      fieldDef("supplier", "Proveedor", true, ["proveedor", "vendedor", "razon social proveedor"]), fieldDef("date", "Fecha", true, ["fecha", "fecha de compra", "fecha factura"]),
      fieldDef("total", "Total COP", true, ["total", "valor total", "total cop", "valor"]), fieldDef("status", "Estado", false, ["estado", "estado de compra"]),
      fieldDef("detail", "Detalle", false, ["detalle", "descripcion", "producto"]), fieldDef("productSku", "Producto SKU", false, ["producto sku", "sku", "codigo"]), fieldDef("quantity", "Cantidad", false, ["cantidad", "unidades"])
    ],
    production: [
      fieldDef("id", "ID", false, ["id", "identificador"]), fieldDef("number", "Número de orden", true, ["numero de orden", "orden", "orden de produccion", "consecutivo"]),
      fieldDef("productSku", "Producto SKU", false, ["producto sku", "sku", "codigo de producto"]), fieldDef("product", "Producto", false, ["producto", "producto terminado", "nombre del producto"]),
      fieldDef("quantity", "Cantidad", true, ["cantidad", "unidades", "cantidad producida"]), fieldDef("date", "Fecha", true, ["fecha", "fecha de orden", "fecha de produccion"]),
      fieldDef("status", "Estado", false, ["estado", "estado de orden"]), fieldDef("wasteKg", "Desperdicio kg", false, ["desperdicio", "desperdicio kg", "residuo kg"]), fieldDef("completedDate", "Fecha de terminación", false, ["fecha de terminacion", "fecha finalizacion"])
    ],
    productionInputs: [fieldDef("productionNumber", "Número de orden", true, ["numero de orden", "orden", "orden de produccion"]), fieldDef("sku", "Material SKU", true, ["material sku", "sku", "codigo material"]), fieldDef("quantity", "Cantidad consumida", true, ["cantidad consumida", "cantidad", "consumo"])],
    environment: [
      fieldDef("period", "Período", true, ["periodo", "mes", "periodo ambiental"]), fieldDef("electricityKwh", "Energía kWh", false, ["energia kwh", "energia", "electricidad", "kwh"]),
      fieldDef("waterM3", "Agua m³", false, ["agua m3", "agua", "metros cubicos"]), fieldDef("fuelL", "Combustible L", false, ["combustible l", "combustible", "gasolina", "diesel"]),
      fieldDef("organicKg", "Residuos orgánicos kg", false, ["residuos organicos kg", "organicos", "residuos organicos"]), fieldDef("recyclableKg", "Aprovechables kg", false, ["aprovechables kg", "aprovechables", "reciclables"]),
      fieldDef("nonRecyclableKg", "No aprovechables kg", false, ["no aprovechables kg", "no aprovechables", "ordinarios"]), fieldDef("hazardousKg", "Peligrosos kg", false, ["peligrosos kg", "peligrosos", "residuos peligrosos"]),
      fieldDef("recycledKg", "Reciclado kg", false, ["reciclado kg", "reciclado o reutilizado kg", "reciclado o reutilizado", "reutilizado", "reciclado"]), fieldDef("productionUnits", "Producción unidades", false, ["produccion unidades", "unidades producidas", "produccion"]),
      fieldDef("energySource", "Origen energía", false, ["origen energia", "fuente energia"]), fieldDef("energyMethod", "Método energía", false, ["metodo energia"]), fieldDef("energyCapturedAt", "Fecha de confirmación energía", false, ["fecha de confirmacion energia"]),
      fieldDef("waterSource", "Origen agua", false, ["origen agua", "fuente agua"]), fieldDef("waterMethod", "Método agua", false, ["metodo agua"]), fieldDef("waterCapturedAt", "Fecha de confirmación agua", false, ["fecha de confirmacion agua"])
    ],
    extras: [fieldDef("entity", "Entidad", true, ["entidad", "tipo de dato"]), fieldDef("recordKey", "Clave del registro", true, ["clave del registro", "clave", "registro"]), fieldDef("field", "Campo original", true, ["campo original", "campo"]), fieldDef("value", "Valor", false, ["valor", "dato"])]
  };

  function fieldDef(key, label, required, aliases) { return { key: key, label: label, required: required, aliases: aliases }; }
  function importFields(entity) { return IMPORT_FIELDS[entity] || []; }
  function importEntityLabel(entity) { return IMPORT_ENTITIES[entity] || entity; }
  function importEntityOptions() {
    return Object.keys(IMPORT_ENTITIES).map(function (key) { return '<option value="' + key + '">' + esc(IMPORT_ENTITIES[key]) + '</option>'; }).join("");
  }
  /* Importación Excel: detección y lectura de columnas */
  function normalizedText(value) {
    return String(value == null ? "" : value).replace(/³/g, "3").toLocaleLowerCase("es-CO").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }
  function guessImportEntity(name) {
    var value = normalizedText(name);
    var aliases = { company: ["empresa", "compania"], contacts: ["contactos", "contacto", "clientes", "proveedores"], products: ["productos", "inventario", "items", "articulos"], recipes: ["recetas", "formula", "materiales por producto"], sales: ["ventas", "facturas", "facturas de venta"], saleLines: ["detalle de ventas", "detalle ventas", "lineas de venta"], purchases: ["compras", "ordenes de compra"], production: ["produccion", "ordenes de produccion"], productionInputs: ["consumos de produccion", "consumo produccion"], environment: ["impacto ambiental", "ambiental", "medio ambiente"], extras: ["datos adicionales"] };
    return Object.keys(aliases).find(function (key) { return aliases[key].some(function (alias) { return value === normalizedText(alias); }); }) || "ignore";
  }
  function mapImportHeader(header, entity) {
    var value = normalizedText(header);
    if (!value) return "";
    var field = importFields(entity).find(function (item) { return item.aliases.some(function (alias) { return normalizedText(alias) === value; }); });
    return field ? field.key : "";
  }
  function guessHeaderRow(rows, entity) {
    var best = 0, bestScore = -1;
    rows.slice(0, 10).forEach(function (row, index) {
      var seen = {};
      row.forEach(function (cell) { var key = mapImportHeader(cell, entity); if (key) seen[key] = true; });
      var score = Object.keys(seen).length;
      if (score > bestScore) { best = index; bestScore = score; }
    });
    return best;
  }
  function startExcelImport(file) {
    if (!window.Pyme360Excel) return toast("No está listo el Excel", "Recarga la página e inténtalo de nuevo.");
    window.Pyme360Excel.readFile(file).then(function (parsed) {
      importSession = { name: parsed.name, updateDuplicates: false, openSheet: 0, sheets: parsed.sheets.map(function (sheet) {
        var entity = guessImportEntity(sheet.name);
        var headerRow = guessHeaderRow(sheet.rows, entity);
        var mapping = {};
        (sheet.rows[headerRow] || []).forEach(function (cell, index) { var key = mapImportHeader(cell, entity); if (key && mapping[key] == null) mapping[key] = index; });
        return { name: sheet.name, rows: sheet.rows, config: { entity: entity, headerRow: headerRow, mapping: mapping } };
      }) };
      render();
      toast("Archivo leído", "Revisa las hojas y columnas antes de guardar.");
    }).catch(function (error) { toast("No se pudo abrir el Excel", error.message || "Revisa el archivo e inténtalo de nuevo."); });
  }
  function configureImportSheet(sheetIndex, entity, headerRow) {
    var sheet = importSession && importSession.sheets[sheetIndex];
    if (!sheet) return;
    var mapping = {};
    (sheet.rows[headerRow] || []).forEach(function (cell, index) { var key = mapImportHeader(cell, entity); if (key && mapping[key] == null) mapping[key] = index; });
    sheet.config = { entity: entity, headerRow: headerRow, mapping: mapping };
  }

  function importNumber(value) {
    if (value == null || value === "") return "";
    if (typeof value === "number") return Number.isFinite(value) ? value : "";
    var text = String(value).trim().replace(/\s/g, "").replace(/\$/g, "");
    if (!text) return "";
    if (text.indexOf(",") >= 0 && text.indexOf(".") >= 0) text = text.replace(/\./g, "").replace(",", ".");
    else if (text.indexOf(",") >= 0) text = text.replace(",", ".");
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
    var number = Number(text);
    return Number.isFinite(number) ? number : "";
  }
  function importDate(value) {
    if (value == null || value === "") return "";
    if (typeof value === "number" && window.XLSX && window.XLSX.SSF) {
      var parsed = window.XLSX.SSF.parse_date_code(value);
      if (parsed) return String(parsed.y).padStart(4, "0") + "-" + String(parsed.m).padStart(2, "0") + "-" + String(parsed.d).padStart(2, "0");
    }
    var text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    var match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (match) return String(match[3].length === 2 ? "20" + match[3] : match[3]).padStart(4, "0") + "-" + String(match[2]).padStart(2, "0") + "-" + String(match[1]).padStart(2, "0");
    return text;
  }
  function validImportDate(value) {
    var match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    var date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() + 1 === Number(match[2]) && date.getUTCDate() === Number(match[3]);
  }
  function parsedImportRow(sheet, rowIndex) {
    var config = sheet.config;
    var fields = importFields(config.entity);
    var header = sheet.rows[config.headerRow] || [];
    var row = sheet.rows[rowIndex] || [];
    var data = {};
    fields.forEach(function (field) {
      var column = config.mapping[field.key];
      var value = column == null ? "" : row[column];
      if (["date", "paidDate", "completedDate"].indexOf(field.key) >= 0) value = importDate(value);
      else if (field.key === "period" && typeof value === "number" && window.XLSX && window.XLSX.SSF) {
        var periodDate = window.XLSX.SSF.parse_date_code(value);
        value = periodDate ? String(periodDate.y).padStart(4, "0") + "-" + String(periodDate.m).padStart(2, "0") : "";
      }
      else if (["stock", "min", "cost", "price", "taxRate", "total", "quantity", "amount", "wasteKg", "electricityKwh", "waterM3", "fuelL", "organicKg", "recyclableKg", "nonRecyclableKg", "hazardousKg", "recycledKg", "productionUnits"].indexOf(field.key) >= 0) value = importNumber(value);
      else if (config.entity === "extras" && field.key === "value") value = value == null ? "" : value;
      else value = String(value == null ? "" : value).trim();
      data[field.key] = value;
    });
    return { data: data, header: header, row: row };
  }
  /* Importación Excel: validación y deduplicación */
  function importRecordKey(entity, data) {
    if (entity === "company") return normalizedText(data.companyNit || data.company || "empresa");
    if (entity === "contacts") return normalizedText(data.idNumber || (data.name + "|" + data.role));
    if (entity === "products") return normalizedText(data.sku || (data.name + "|" + data.type));
    if (entity === "sales") return normalizedText(data.number);
    if (entity === "purchases") return normalizedText(data.number + "|" + data.supplier);
    if (entity === "production") return normalizedText(data.number);
    if (entity === "environment") return normalizedText(data.period);
    if (entity === "recipes") return normalizedText(data.productSku + "|" + data.materialSku);
    if (entity === "saleLines") return normalizedText(data.saleNumber + "|" + data.sku);
    if (entity === "productionInputs") return normalizedText(data.productionNumber + "|" + data.sku);
    return "";
  }
  function findImportDuplicate(entity, data) {
    var collection = entity === "contacts" ? state.contacts : entity === "products" ? state.inventory : entity === "sales" ? state.sales : entity === "purchases" ? state.purchases : entity === "production" ? state.production : entity === "environment" ? state.environment : [];
    return collection.find(function (item) {
      if (entity === "company") return (data.companyNit && normalizedText(item.companyNit) === normalizedText(data.companyNit)) || (!!data.company && normalizedText(item.company) === normalizedText(data.company));
      if (entity === "contacts") return (!!data.idNumber && !!item.idNumber && normalizedText(item.idNumber) === normalizedText(data.idNumber)) || ((!data.idNumber || !item.idNumber) && normalizedText(item.name) === normalizedText(data.name) && normalizedText(item.role) === normalizedText(data.role));
      if (entity === "products") return (!!data.sku && !!item.sku && normalizedText(item.sku) === normalizedText(data.sku)) || ((!data.sku || !item.sku) && normalizedText(item.name) === normalizedText(data.name) && normalizedText(item.type) === normalizedText(data.type));
      if (entity === "purchases") return normalizedText(item.number) === normalizedText(data.number) && normalizedText(item.supplier) === normalizedText(data.supplier);
      if (entity === "sales" || entity === "production") return normalizedText(item.number) === normalizedText(data.number);
      if (entity === "environment") return normalizedText(item.period) === normalizedText(data.period);
      return false;
    });
  }
  function importRoleMatches(item, role) {
    return !role || normalizedText(item.role).indexOf(normalizedText(role)) >= 0 || (role === "Cliente" && normalizedText(item.role).indexOf("cliente") >= 0) || (role === "Proveedor" && normalizedText(item.role).indexOf("proveedor") >= 0);
  }
  function lookupParty(reference, role, candidates) {
    var key = normalizedText(reference);
    if (!key) return null;
    var existing = state.contacts.find(function (item) { return importRoleMatches(item, role) && (normalizedText(item.idNumber) === key || normalizedText(item.name) === key); });
    if (existing) return existing;
    var incoming = candidates.find(function (item) { return item.entity === "contacts" && !item.invalid && importRoleMatches(item.data, role) && (normalizedText(item.data.idNumber) === key || normalizedText(item.data.name) === key); });
    return incoming ? incoming.data : null;
  }
  function lookupProduct(reference, candidates) {
    var key = normalizedText(reference);
    if (!key) return null;
    var existing = state.inventory.find(function (item) { return normalizedText(item.sku) === key || normalizedText(item.name) === key; });
    if (existing) return existing;
    var incoming = candidates.find(function (item) { return item.entity === "products" && !item.invalid && (normalizedText(item.data.sku) === key || normalizedText(item.data.name) === key); });
    return incoming ? incoming.data : null;
  }
  function lookupDocument(entity, reference, candidates) {
    var key = normalizedText(reference);
    if (!key) return null;
    var collection = entity === "sales" ? state.sales : state.production;
    var existing = collection.find(function (item) { return normalizedText(item.number) === key; });
    if (existing) return existing;
    var incoming = candidates.find(function (item) { return item.entity === entity && !item.invalid && normalizedText(item.data.number) === key; });
    return incoming ? incoming.data : null;
  }
  function normalizedEnum(value, allowed) {
    var key = normalizedText(value);
    var match = allowed.find(function (item) { return normalizedText(item) === key; });
    return match || value;
  }
  function sameImportRecord(entity, left, right) {
    if (entity === "contacts") return (!!left.idNumber && !!right.idNumber && normalizedText(left.idNumber) === normalizedText(right.idNumber)) || ((!left.idNumber || !right.idNumber) && normalizedText(left.name) === normalizedText(right.name) && normalizedText(left.role) === normalizedText(right.role));
    if (entity === "products") return (!!left.sku && !!right.sku && normalizedText(left.sku) === normalizedText(right.sku)) || ((!left.sku || !right.sku) && normalizedText(left.name) === normalizedText(right.name) && normalizedText(left.type) === normalizedText(right.type));
    if (entity === "purchases") return normalizedText(left.number) === normalizedText(right.number) && normalizedText(left.supplier) === normalizedText(right.supplier);
    if (entity === "sales" || entity === "production") return normalizedText(left.number) === normalizedText(right.number);
    if (entity === "environment") return normalizedText(left.period) === normalizedText(right.period);
    if (entity === "company") return (!!left.companyNit && !!right.companyNit && normalizedText(left.companyNit) === normalizedText(right.companyNit)) || ((!left.companyNit || !right.companyNit) && normalizedText(left.company) === normalizedText(right.company));
    return false;
  }
  function collectUnknownFields(header, row, mapping) {
    var mapped = {};
    Object.keys(mapping).forEach(function (key) { mapped[mapping[key]] = true; });
    var fields = {};
    header.forEach(function (cell, index) {
      var name = String(cell == null ? "" : cell).trim();
      var value = row[index];
      if (!mapped[index] && name && value != null && String(value).trim() !== "") fields[name] = value;
    });
    return fields;
  }
  function buildImportAnalysis() {
    var candidates = [], details = [], extras = [], issues = [], duplicates = [];
    if (!importSession) return { valid: [], duplicates: [], issues: [], details: [], extras: [] };
    importSession.sheets.forEach(function (sheet, sheetIndex) {
      var entity = sheet.config.entity;
      if (!entity || entity === "ignore") return;
      var header = sheet.rows[sheet.config.headerRow] || [];
      for (var rowIndex = sheet.config.headerRow + 1; rowIndex < sheet.rows.length; rowIndex += 1) {
        var sourceRow = sheet.rows[rowIndex] || [];
        if (!sourceRow.some(function (cell) { return String(cell == null ? "" : cell).trim() !== ""; })) continue;
        var parsed = parsedImportRow(sheet, rowIndex);
        var candidate = { entity: entity, data: parsed.data, sourceSheet: sheet.name, sourceRow: rowIndex + 1, sheetIndex: sheetIndex, raw: sourceRow, header: header };
        if (entity === "extras") {
          var extra = { entity: String(parsed.data.entity || "").trim(), recordKey: String(parsed.data.recordKey || "").trim(), field: String(parsed.data.field || "").trim(), value: parsed.data.value };
          if (!extra.entity || !extra.recordKey || !extra.field) issues.push({ sheet: sheet.name, row: rowIndex + 1, label: "Dato adicional", reason: "Completa entidad, clave del registro y campo original." });
          else extras.push(extra);
          continue;
        }
        if (["recipes", "saleLines", "productionInputs"].indexOf(entity) >= 0) { details.push(candidate); continue; }
        if (entity === "company" && !candidate.data.company && !candidate.data.companyNit && !candidate.data.city && !candidate.data.activityType) continue;
        candidate.unknown = collectUnknownFields(header, sourceRow, sheet.config.mapping);
        candidates.push(candidate);
      }
    });

    var candidatePriority = { company: 0, contacts: 1, products: 2, sales: 3, purchases: 4, production: 5, environment: 6 };
    candidates.sort(function (a, b) { return (candidatePriority[a.entity] == null ? 99 : candidatePriority[a.entity]) - (candidatePriority[b.entity] == null ? 99 : candidatePriority[b.entity]); });
    var seen = {}, seenRecords = [];
    candidates.forEach(function (candidate) {
      var data = candidate.data, entity = candidate.entity, errors = [];
      importFields(entity).forEach(function (field) {
        var value = data[field.key];
        if (field.required && (value === "" || value == null)) errors.push("Falta " + field.label.toLocaleLowerCase("es-CO") + ".");
      });
      ["stock", "min", "cost", "price", "taxRate", "total", "quantity", "amount", "wasteKg", "electricityKwh", "waterM3", "fuelL", "organicKg", "recyclableKg", "nonRecyclableKg", "hazardousKg", "recycledKg", "productionUnits"].forEach(function (key) {
        if (data[key] !== "" && data[key] != null && (!Number.isFinite(Number(data[key])) || Number(data[key]) < 0)) errors.push(key === "total" ? "El total no puede ser negativo." : "El valor de " + key + " debe ser un número igual o mayor que cero.");
      });
      if (data.taxRate !== "" && Number(data.taxRate) > 100) errors.push("La tarifa de IVA debe estar entre 0 y 100.");
      ["stock", "min", "cost", "price", "taxRate", "total", "quantity", "amount", "wasteKg", "electricityKwh", "waterM3", "fuelL", "organicKg", "recyclableKg", "nonRecyclableKg", "hazardousKg", "recycledKg", "productionUnits"].forEach(function (key) {
        if (data[key] === "" && importFields(entity).some(function (field) { return field.key === key && field.required; })) errors.push("El valor de " + key + " debe ser un número.");
      });
      if (["date", "paidDate", "completedDate"].some(function (key) { return data[key] && !validImportDate(data[key]); })) errors.push("La fecha debe tener un formato válido.");
      if (entity === "environment" && data.period && (!/^\d{4}-\d{2}$/.test(data.period) || Number(data.period.slice(5, 7)) < 1 || Number(data.period.slice(5, 7)) > 12)) errors.push("El período debe tener el formato AAAA-MM y un mes entre 01 y 12.");
      if (entity === "contacts" && data.role) {
        data.role = normalizedEnum(data.role, ["Cliente", "Proveedor", "Cliente · Proveedor"]);
        if (["cliente", "proveedor", "cliente proveedor"].indexOf(normalizedText(data.role)) < 0) errors.push("El tipo debe ser Cliente, Proveedor o Cliente · Proveedor.");
      }
      if (entity === "products" && data.type) {
        data.type = normalizedEnum(data.type, ["Producto terminado", "Materia prima", "Insumo"]);
        if (["producto terminado", "materia prima", "insumo"].indexOf(normalizedText(data.type)) < 0) errors.push("El tipo de producto no coincide con las opciones de Pyme360.");
      }
      if (entity === "sales") {
        var customer = lookupParty(data.customer, "Cliente", candidates);
        if (data.customer && !customer) errors.push("No se encontró el cliente. Regístralo en Contactos o corrige la referencia.");
        else if (customer) data.customer = customer.name;
        if (data.status) {
          data.status = normalizedEnum(data.status, ["Pagada", "Pendiente de pago"]);
          if (["pagada", "pendiente de pago"].indexOf(normalizedText(data.status)) < 0) errors.push("El estado de venta debe ser Pagada o Pendiente de pago.");
        }
        if (!data.status) data.status = data.payment === "Contado" ? "Pagada" : "Pendiente de pago";
        if (!data.payment) data.payment = data.status === "Pagada" ? "Contado" : "Crédito";
      } else if (entity === "purchases") {
        var supplier = lookupParty(data.supplier, "Proveedor", candidates);
        if (data.supplier && !supplier) errors.push("No se encontró el proveedor. Regístralo en Contactos o corrige la referencia.");
        else if (supplier) data.supplier = supplier.name;
        if (data.productSku && !lookupProduct(data.productSku, candidates)) errors.push("No se encontró el producto de la compra. Revisa el SKU.");
        if (data.status) {
          data.status = normalizedEnum(data.status, ["Recibida", "Por recibir", "Pagada"]);
          if (["recibida", "por recibir", "pagada"].indexOf(normalizedText(data.status)) < 0) errors.push("El estado de compra debe ser Recibida, Por recibir o Pagada.");
        }
        if (!data.status) data.status = "Por recibir";
      } else if (entity === "production") {
        var product = lookupProduct(data.productSku || data.product, candidates);
        if ((data.productSku || data.product) && !product) errors.push("No se encontró el producto de la orden. Revisa su SKU o nombre.");
        else if (product) { data.product = product.name; data.productSku = product.sku; }
        if (!data.product && !data.productSku) errors.push("La orden necesita un producto o un SKU.");
        if (data.status) {
          data.status = normalizedEnum(data.status, ["En proceso", "Terminada"]);
          if (["en proceso", "terminada"].indexOf(normalizedText(data.status)) < 0) errors.push("El estado de producción debe ser En proceso o Terminada.");
        }
        if (!data.status) data.status = "En proceso";
      }
      if (errors.length) {
        errors.forEach(function (reason) { issues.push({ sheet: candidate.sourceSheet, row: candidate.sourceRow, label: importEntityLabel(entity), reason: reason }); });
        candidate.invalid = true;
        return;
      }
      var duplicate = findImportDuplicate(entity, data);
      var key = entity + "|" + importRecordKey(entity, data);
      candidate.label = importEntityLabel(entity);
      candidate.keyLabel = importRecordKey(entity, data);
      if (duplicate) { candidate.duplicate = duplicate; candidate.existing = duplicate; }
      else {
        var prior = seenRecords.find(function (item) { return item.entity === entity && sameImportRecord(entity, item.data, data); });
        if (prior) { candidate.duplicate = prior; candidate.existing = prior.data; }
      }
      if (!candidate.duplicate && entity === "company") {
        var priorCompany = seenRecords.find(function (item) { return item.entity === "company"; });
        if (priorCompany) { candidate.duplicate = priorCompany; candidate.existing = priorCompany.data; }
      }
      if (candidate.duplicate) { /* La fila se mostrará como duplicada para revisión. */ }
      else if (entity === "company" && (state.company || state.companyNit)) { candidate.duplicate = state; candidate.existing = state; }
      if (candidate.duplicate) duplicates.push(candidate);
      else { seen[key] = candidate; seenRecords.push(candidate); }
      candidate.unknownExtras = Object.keys(candidate.unknown).map(function (field) { return { entity: entity, recordKey: importRecordKey(entity, data), field: field, value: candidate.unknown[field] }; });
    });

    details.forEach(function (detail) {
      var data = detail.data, errors = [];
      if (detail.entity === "recipes") {
        if (!lookupProduct(data.productSku, candidates)) errors.push("No se encontró el producto de la receta.");
        if (!lookupProduct(data.materialSku, candidates)) errors.push("No se encontró la materia prima de la receta.");
        if (data.amount === "" || Number(data.amount) <= 0) errors.push("La cantidad de la receta debe ser mayor que cero.");
      } else if (detail.entity === "saleLines") {
        if (!lookupDocument("sales", data.saleNumber, candidates)) errors.push("No se encontró la venta relacionada.");
        if (!lookupProduct(data.sku, candidates)) errors.push("No se encontró el producto de la venta.");
        if (data.quantity === "" || Number(data.quantity) <= 0) errors.push("La cantidad debe ser mayor que cero.");
      } else {
        if (!lookupDocument("production", data.productionNumber, candidates)) errors.push("No se encontró la orden de producción relacionada.");
        if (!lookupProduct(data.sku, candidates)) errors.push("No se encontró el material consumido.");
        if (data.quantity === "" || Number(data.quantity) < 0) errors.push("La cantidad consumida debe ser un número válido.");
      }
      detail.valid = errors.length === 0;
      detail.label = importEntityLabel(detail.entity);
      detail.unknown = collectUnknownFields(detail.header, detail.raw, importSession.sheets[detail.sheetIndex].config.mapping);
      if (errors.length) errors.forEach(function (reason) { issues.push({ sheet: detail.sourceSheet, row: detail.sourceRow, label: importEntityLabel(detail.entity), reason: reason }); });
      if (detail.valid) {
        var detailKey = importRecordKey(detail.entity, data);
        var parentEntity = detail.entity === "recipes" ? "products" : detail.entity === "saleLines" ? "sales" : "production";
        var parentRef = detail.entity === "recipes" ? data.productSku : detail.entity === "saleLines" ? data.saleNumber : data.productionNumber;
        var parent = detail.entity === "recipes" ? lookupProduct(parentRef, candidates) : lookupDocument(parentEntity, parentRef, candidates);
        var childRef = detail.entity === "recipes" ? data.materialSku : data.sku;
        if (detail.entity === "recipes") detail.duplicate = !!(parent && parent.inputs && parent.inputs.some(function (line) { return normalizedText(line.sku) === normalizedText(childRef); }));
        else if (detail.entity === "saleLines") detail.duplicate = !!(parent && parent.lines && parent.lines.some(function (line) { return normalizedText(line.sku) === normalizedText(childRef); }));
        else detail.duplicate = !!(parent && parent.inputConsumption && parent.inputConsumption.some(function (line) { return normalizedText(line.sku) === normalizedText(childRef); }));
        var seenDetailKey = "detail|" + detail.entity + "|" + detailKey;
        if (seen[seenDetailKey]) detail.duplicate = true;
        seen[seenDetailKey] = true;
        detail.keyLabel = detailKey;
        if (detail.duplicate) duplicates.push(detail);
        detail.unknownExtras = Object.keys(detail.unknown).map(function (field) { return { entity: detail.entity, recordKey: detailKey, field: field, value: detail.unknown[field] }; });
      }
    });
    return { valid: candidates.filter(function (candidate) { return !candidate.invalid && !candidate.duplicate; }), candidates: candidates, duplicates: duplicates, issues: issues, details: details, extras: extras };
  }

  /* Importación Excel: aplicación transaccional */
  function importTarget(collection, entity, data) {
    return collection.find(function (item) {
      if (entity === "contacts") return (!!data.idNumber && !!item.idNumber && normalizedText(item.idNumber) === normalizedText(data.idNumber)) || ((!data.idNumber || !item.idNumber) && normalizedText(item.name) === normalizedText(data.name) && normalizedText(item.role) === normalizedText(data.role));
      if (entity === "products") return (!!data.sku && !!item.sku && normalizedText(item.sku) === normalizedText(data.sku)) || ((!data.sku || !item.sku) && normalizedText(item.name) === normalizedText(data.name) && normalizedText(item.type) === normalizedText(data.type));
      if (entity === "environment") return normalizedText(item.period) === normalizedText(data.period);
      if (entity === "purchases") return normalizedText(item.number) === normalizedText(data.number) && normalizedText(item.supplier) === normalizedText(data.supplier);
      return normalizedText(item.number) === normalizedText(data.number);
    });
  }
  function importStateKey(entity, item) {
    if (entity === "company") return importRecordKey(entity, { companyNit: item.companyNit, company: item.company });
    if (entity === "contacts") return importRecordKey(entity, item);
    if (entity === "products") return importRecordKey(entity, item);
    if (entity === "sales" || entity === "production") return normalizedText(item.number);
    if (entity === "purchases") return normalizedText(item.number + "|" + item.supplier);
    if (entity === "environment") return normalizedText(item.period);
    return "";
  }
  function addImportExtras(target, items, entity, recordKey) {
    (items || []).forEach(function (item) {
      var value = { entity: entity, recordKey: recordKey, field: item.field, value: item.value };
      var existing = target.importExtras.find(function (entry) { return entry.entity === value.entity && entry.recordKey === value.recordKey && entry.field === value.field; });
      if (existing) existing.value = value.value;
      else target.importExtras.push(value);
    });
  }
  function applyImportCandidate(next, candidate, updateDuplicates, stats) {
    var entity = candidate.entity, data = candidate.data, collection, target, prefix;
    if (entity === "company") {
      target = next;
      var companyFields = ["company", "companyNit", "city", "activityType"];
      var wasConfigured = !!(next.company || next.companyNit);
      companyFields.forEach(function (key) { if (data[key] !== "" && data[key] != null) target[key] = data[key]; });
      if (wasConfigured) stats.updated += 1; else stats.added += 1;
      addImportExtras(next, candidate.unknownExtras, entity, importStateKey(entity, target));
      return;
    }
    collection = entity === "contacts" ? next.contacts : entity === "products" ? next.inventory : entity === "sales" ? next.sales : entity === "purchases" ? next.purchases : entity === "production" ? next.production : next.environment;
    target = importTarget(collection, entity, data);
    var isUpdate = !!target;
    if (!target) {
      var importedId = data.id && !["contacts", "inventory", "sales", "purchases", "production"].some(function (name) { return (next[name] || []).some(function (item) { return item.id === data.id; }); }) ? data.id : "imp-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
      target = Object.assign({}, data, { id: importedId });
      if (entity === "contacts") {
        target.email = target.email || ""; target.phone = target.phone || ""; target.idNumber = target.idNumber || "";
      } else if (entity === "products") {
        ["stock", "min", "cost", "price", "taxRate"].forEach(function (key) { if (target[key] === "") target[key] = 0; });
        target.inputs = [];
      } else if (entity === "sales") {
        target.total = Number(target.total) || 0; target.lines = []; target.demo = true;
      } else if (entity === "purchases") {
        target.total = Number(target.total) || 0; target.detail = target.detail || "";
      } else if (entity === "production") {
        target.quantity = Number(target.quantity) || 0; target.wasteKg = Number(target.wasteKg) || 0; target.inputConsumption = [];
        var linkedProduct = next.inventory.find(function (product) { return normalizedText(product.sku) === normalizedText(data.productSku) || normalizedText(product.name) === normalizedText(data.product); });
        if (linkedProduct) target.productId = linkedProduct.id;
      } else if (entity === "environment") {
        ["electricityKwh", "waterM3", "fuelL", "organicKg", "recyclableKg", "nonRecyclableKg", "hazardousKg", "recycledKg", "productionUnits"].forEach(function (key) { if (target[key] === "") target[key] = 0; });
      }
      collection.unshift(target);
      stats.added += 1;
    } else {
      if (updateDuplicates) {
        Object.keys(data).forEach(function (key) {
          if (key === "id" || key === "lines" || key === "inputs" || key === "inputConsumption") return;
          if (data[key] !== "" && data[key] != null) target[key] = data[key];
        });
        if (entity === "production") {
          var productRef = next.inventory.find(function (product) { return normalizedText(product.sku) === normalizedText(data.productSku) || normalizedText(product.name) === normalizedText(data.product); });
          if (productRef) target.productId = productRef.id;
        }
        stats.updated += 1;
      } else stats.skipped += 1;
    }
    addImportExtras(next, candidate.unknownExtras, entity, importStateKey(entity, target));
  }
  function commitExcelImport() {
    if (!importSession) return;
    var analysis = buildImportAnalysis();
    var updateDuplicates = !!importSession.updateDuplicates;
    var accepted = analysis.valid.concat(updateDuplicates ? analysis.duplicates.filter(function (item) { return item.entity !== "recipes" && item.entity !== "saleLines" && item.entity !== "productionInputs"; }) : []);
    var stats = { added: 0, updated: 0, skipped: updateDuplicates ? 0 : analysis.duplicates.filter(function (item) { return ["recipes", "saleLines", "productionInputs"].indexOf(item.entity) < 0; }).length };
    try {
      var next = JSON.parse(JSON.stringify(state));
      var priority = { company: 0, contacts: 1, products: 2, sales: 3, purchases: 4, production: 5, environment: 6 };
      accepted.sort(function (a, b) { return (priority[a.entity] == null ? 99 : priority[a.entity]) - (priority[b.entity] == null ? 99 : priority[b.entity]); }).forEach(function (candidate) {
        applyImportCandidate(next, candidate, updateDuplicates, stats);
      });

      function parentWasAccepted(detail, parentEntity, reference) {
        var parents = analysis.candidates;
        var matches = parents.filter(function (candidate) {
          if (candidate.entity !== parentEntity) return false;
          return parentEntity === "products" ? normalizedText(candidate.data.sku) === normalizedText(reference) || normalizedText(candidate.data.name) === normalizedText(reference) : normalizedText(candidate.data.number) === normalizedText(reference);
        });
        if (matches.length) return matches.some(function (parent) { return accepted.indexOf(parent) >= 0; });
        return true;
      }
      analysis.details.forEach(function (detail) {
        if (!detail.valid || (detail.duplicate && !updateDuplicates)) { stats.skipped += 1; return; }
        var data = detail.data;
        if (detail.entity === "recipes") {
          if (!parentWasAccepted(detail, "products", data.productSku)) { stats.skipped += 1; return; }
          var product = next.inventory.find(function (item) { return normalizedText(item.sku) === normalizedText(data.productSku) || normalizedText(item.name) === normalizedText(data.productSku); });
          var material = next.inventory.find(function (item) { return normalizedText(item.sku) === normalizedText(data.materialSku) || normalizedText(item.name) === normalizedText(data.materialSku); });
          if (!product || !material) { stats.skipped += 1; return; }
          product.inputs = product.inputs || [];
          var recipeLine = product.inputs.find(function (line) { return normalizedText(line.sku) === normalizedText(material.sku); });
          if (recipeLine) { if (updateDuplicates) { recipeLine.amount = Number(data.amount); stats.updated += 1; } else stats.skipped += 1; }
          else { product.inputs.push({ sku: material.sku, amount: Number(data.amount) }); stats.added += 1; }
        } else if (detail.entity === "saleLines") {
          if (!parentWasAccepted(detail, "sales", data.saleNumber)) { stats.skipped += 1; return; }
          var sale = next.sales.find(function (item) { return normalizedText(item.number) === normalizedText(data.saleNumber); });
          var saleProduct = next.inventory.find(function (item) { return normalizedText(item.sku) === normalizedText(data.sku) || normalizedText(item.name) === normalizedText(data.sku); });
          if (!sale || !saleProduct) { stats.skipped += 1; return; }
          sale.lines = sale.lines || [];
          var saleLine = sale.lines.find(function (line) { return normalizedText(line.sku) === normalizedText(saleProduct.sku); });
          if (saleLine) { if (updateDuplicates) { saleLine.quantity = Number(data.quantity); stats.updated += 1; } else stats.skipped += 1; }
          else { sale.lines.push({ sku: saleProduct.sku, quantity: Number(data.quantity) }); stats.added += 1; }
        } else {
          if (!parentWasAccepted(detail, "production", data.productionNumber)) { stats.skipped += 1; return; }
          var order = next.production.find(function (item) { return normalizedText(item.number) === normalizedText(data.productionNumber); });
          var inputProduct = next.inventory.find(function (item) { return normalizedText(item.sku) === normalizedText(data.sku) || normalizedText(item.name) === normalizedText(data.sku); });
          if (!order || !inputProduct) { stats.skipped += 1; return; }
          order.inputConsumption = order.inputConsumption || [];
          var consumption = order.inputConsumption.find(function (line) { return normalizedText(line.sku) === normalizedText(inputProduct.sku); });
          if (consumption) { if (updateDuplicates) { consumption.quantity = Number(data.quantity); stats.updated += 1; } else stats.skipped += 1; }
          else { order.inputConsumption.push({ sku: inputProduct.sku, quantity: Number(data.quantity) }); stats.added += 1; }
        }
        addImportExtras(next, detail.unknownExtras, detail.entity, importRecordKey(detail.entity, data));
      });
      analysis.extras.forEach(function (extra) { addImportExtras(next, [extra], String(extra.entity), String(extra.recordKey)); });

      var serialized = JSON.stringify(next);
      var bytes = new Blob([serialized]).size;
      var localBytes = 0;
      for (var index = 0; index < localStorage.length; index += 1) {
        var key = localStorage.key(index);
        if (key !== STORAGE_KEY) localBytes += ((key || "").length + (localStorage.getItem(key) || "").length) * 2;
      }
      if (bytes + localBytes > 4500000) throw new Error("Los datos ocuparían demasiado espacio en este navegador. Divide el archivo o descarga tu Excel maestro antes de continuar.");
      localStorage.setItem(STORAGE_KEY, serialized);
      state = next;
      importSession = null;
    } catch (error) {
      toast("No se aplicó ningún cambio", error && error.name === "QuotaExceededError" ? "El navegador no tiene espacio suficiente. Libera espacio e inténtalo de nuevo." : (error.message || "No se pudo guardar la importación."));
      return;
    }
    render();
    toast("Importación terminada", stats.added + " registros agregados, " + stats.updated + " actualizados, " + stats.skipped + " omitidos y " + analysis.issues.length + " por revisar.");
  }

  /* Cálculos y construcción de formularios */
  function estimateEmissions(record) {
    // Factor ilustrativo para demostración; reemplazar por factores UPME versionados antes del uso productivo.
    return (Number(record.electricityKwh) || 0) * 0.1 + (Number(record.fuelL) || 0) * 2.5;
  }

  function wasteTotal(record) {
    return (Number(record.organicKg) || 0) + (Number(record.recyclableKg) || 0) + (Number(record.nonRecyclableKg) || 0) + (Number(record.hazardousKg) || 0);
  }

  function openModal(title, description, content) {
    var root = document.getElementById("modal-root");
    root.innerHTML = '<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="modal-header"><div><h2>' + title + '</h2><p>' + description + '</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Cerrar">×</button></div>' + content + '</section></div>';
    root.querySelector(".modal-backdrop").addEventListener("click", function (event) {
      if (event.target.classList.contains("modal-backdrop")) closeModal();
    });
    var first = root.querySelector("input, select, button");
    if (first) first.focus();
  }

  function closeModal() {
    if (activeReceiptRead) {
      activeReceiptRead.cancelled = true;
      var workerToStop = activeReceiptRead.worker;
      var pdfToStop = activeReceiptRead.pdf;
      activeReceiptRead.worker = null;
      activeReceiptRead.pdf = null;
      if (workerToStop) workerToStop.terminate().catch(function () {});
      if (pdfToStop) pdfToStop.destroy().catch(function () {});
      activeReceiptRead = null;
    }
    document.getElementById("modal-root").innerHTML = "";
  }

  function formField(label, name, control, full) {
    return '<div class="field' + (full ? " full" : "") + '"><label for="' + name + '">' + label + '</label>' + control + '</div>';
  }

  function modalForm(id, fields, note, submitText) {
    return '<form class="modal-form" id="' + id + '"><div class="form-grid">' + fields + '</div>' + (note ? '<div class="form-note">' + note + '</div>' : "") + '<div class="modal-footer"><button type="button" class="button button-secondary" data-action="close-modal">Cancelar</button><button type="submit" class="button button-primary">' + submitText + '</button></div></form>';
  }

  function productOptions(types) {
    return state.inventory.filter(function (item) { return !types || types.indexOf(item.type) >= 0; }).map(function (item) {
      return '<option value="' + esc(item.id) + '">' + esc(item.name) + ' · ' + num(item.stock, 1) + ' ' + esc(item.unit) + '</option>';
    }).join("");
  }

  function contactOptions(role) {
    return state.contacts.filter(function (item) { return !role || item.role.indexOf(role) >= 0; }).map(function (item) {
      return '<option value="' + esc(item.id) + '">' + esc(item.name) + '</option>';
    }).join("");
  }

  function openSaleModal() {
    var hasCustomer = state.contacts.some(function (item) { return item.role.indexOf("Cliente") >= 0; });
    var hasProduct = state.inventory.some(function (item) { return item.type === "Producto terminado"; });
    if (!hasCustomer || !hasProduct) {
      var nextSteps = '<div class="modal-form"><p>Para registrar una venta primero necesitas tener un cliente y un producto terminado.</p><div class="modal-footer">' +
        (!hasCustomer ? '<button class="button button-secondary" data-page="contacts">Agregar cliente</button>' : '') +
        (!hasProduct ? '<button class="button button-primary" data-action="new-product">Agregar producto</button>' : '') +
        '<button class="button button-quiet" data-action="close-modal">Cerrar</button></div></div>';
      return openModal("Completa estos datos primero", "Tu empresa comienza con sus propios registros.", nextSteps);
    }
    var fields = formField("Cliente", "sale-customer", '<select name="customer" id="sale-customer" required><option value="">Selecciona un cliente</option>' + contactOptions("Cliente") + '</select>') +
      formField("Fecha", "sale-date", '<input name="date" id="sale-date" type="date" value="' + today() + '" required>') +
      formField("Producto", "sale-product", '<select name="product" id="sale-product" required>' + productOptions(["Producto terminado"]) + '</select>') +
      formField("Cantidad", "sale-quantity", '<input name="quantity" id="sale-quantity" type="number" min="1" step="1" value="10" required>') +
      formField("Forma de pago", "sale-payment", '<select name="payment" id="sale-payment"><option>Contado</option><option>15 días</option><option>30 días</option><option>Otro acuerdo</option></select>') +
      formField("Descuento (COP)", "sale-discount", '<input name="discount" id="sale-discount" type="number" min="0" step="1000" value="0">') +
      '<div class="field full"><label>Resumen</label><div class="form-note" id="sale-preview" style="margin:0">Selecciona un producto para ver el total aproximado.</div></div>';
    openModal("Registrar una venta", "Unos pocos datos para dejar tu venta organizada.", modalForm("sale-form", fields, "Modo de demostración: la venta y el movimiento de inventario se guardan aquí. La factura no se transmite a la DIAN.", "Guardar venta"));
    var form = document.getElementById("sale-form");
    form.addEventListener("change", updateSalePreview);
    form.addEventListener("input", updateSalePreview);
    updateSalePreview();
  }

  function updateSalePreview() {
    var form = document.getElementById("sale-form");
    if (!form) return;
    var product = state.inventory.find(function (item) { return item.id === form.elements.product.value; });
    var quantity = Number(form.elements.quantity.value) || 0;
    var discount = Number(form.elements.discount.value) || 0;
    var subtotal = product ? Math.max(0, product.price * quantity - discount) : 0;
    var preview = document.getElementById("sale-preview");
    var rate = product && product.taxType === "Gravado" ? Number(product.taxRate) || 0 : 0;
    if (preview) preview.innerHTML = product ? esc(product.name) + " · " + quantity + " und. · IVA configurado (" + num(rate) + "%) · Total estimado: <strong>" + money(subtotal * (1 + rate / 100)) + "</strong>" : "Selecciona un producto para ver el total aproximado.";
  }

  function openProductionModal() {
    var finishedGoods = state.inventory.filter(function (item) { return item.type === "Producto terminado"; });
    if (!finishedGoods.length || !finishedGoods.some(function (item) { return item.inputs && item.inputs.length; })) {
      return openModal("Prepara tu inventario", "Para iniciar producción necesitas un producto terminado con una receta.", '<div class="modal-form"><p>Agrega primero una materia prima o insumo. Luego crea el producto terminado y asígnale el material que consume por unidad.</p><div class="modal-footer"><button class="button button-secondary" data-page="inventory">Ver inventario</button><button class="button button-primary" data-action="new-product">Agregar producto</button></div></div>');
    }
    var fields = formField("Producto a fabricar", "production-product", '<select name="product" id="production-product" required>' + productOptions(["Producto terminado"]) + '</select>', true) +
      formField("Cantidad a producir", "production-quantity", '<input name="quantity" id="production-quantity" type="number" min="1" step="1" value="20" required>') +
      formField("Desperdicio aproximado (kg)", "production-waste", '<input name="waste" id="production-waste" type="number" min="0" step="0.1" value="0">') +
      formField("Sede", "production-site", '<select name="site" id="production-site"><option>Sede principal</option></select>') +
      '<div class="field full"><label>Materiales estimados</label><div class="form-note" id="production-preview" style="margin:0">Elige un producto para revisar los materiales.</div></div>';
    openModal("Crear orden de producción", "Registra lo que vas a fabricar y revisa los materiales necesarios.", modalForm("production-form", fields, "Al crearla, se reservan los materiales. Cuando termine, marca la orden como terminada para ingresar el producto al inventario.", "Crear orden"));
    var form = document.getElementById("production-form");
    form.addEventListener("change", updateProductionPreview);
    form.addEventListener("input", updateProductionPreview);
    updateProductionPreview();
  }

  function updateProductionPreview() {
    var form = document.getElementById("production-form");
    if (!form) return;
    var product = state.inventory.find(function (item) { return item.id === form.elements.product.value; });
    var quantity = Number(form.elements.quantity.value) || 0;
    var preview = document.getElementById("production-preview");
    if (!product || !preview) return;
    var lines = (product.inputs || []).map(function (input) {
      var material = state.inventory.find(function (item) { return item.sku === input.sku; });
      return material ? esc(material.name) + ": <strong>" + num(input.amount * quantity, 2) + " " + esc(material.unit) + "</strong> · disponible " + num(material.stock, 1) + " " + esc(material.unit) : "";
    }).filter(Boolean);
    preview.innerHTML = lines.length ? lines.join("<br>") : "Este producto no tiene una receta guardada todavía.";
  }

  function openEnvironmentModal() {
    openModal("Registra tu consumo", "Sube un recibo y revisa los datos que encontramos, o anótalos manualmente.",
      '<div class="modal-form"><div class="receipt-choice-grid">' +
      '<button type="button" class="receipt-choice" data-action="environment-pick-receipt"><span class="receipt-choice-icon">↑</span><strong>Subir un recibo</strong><small>Elige un PDF, JPG o PNG desde tu dispositivo.</small></button>' +
      '<button type="button" class="receipt-choice" data-action="environment-example"><span class="receipt-choice-icon">▤</span><strong>Probar con un ejemplo</strong><small>Usa un recibo ficticio para conocer el flujo.</small></button></div>' +
      '<div class="divider"></div><button type="button" class="button button-secondary" data-action="environment-manual">Ingresar datos manualmente</button>' +
      '<input id="environment-receipt-file" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" class="visually-hidden">' +
      '<p class="form-note">El archivo se procesa en el navegador y no se guarda en Pyme360. Siempre podrás corregir lo leído antes de confirmarlo.</p>' +
      '<div class="modal-footer"><button type="button" class="button button-quiet" data-action="close-modal">Cerrar</button></div></div>');
  }

  function openEnvironmentTargetsModal() {
    var goals = state.environmentTargets || { energyReductionPct: null, waterReductionPct: null };
    var energyValue = goals.energyReductionPct == null ? "10" : esc(goals.energyReductionPct);
    var waterValue = goals.waterReductionPct == null ? "10" : esc(goals.waterReductionPct);
    var fields = formField("Mejora de energía por unidad (%)", "target-energy", '<input name="energy" id="target-energy" type="number" min="1" max="99" step="1" value="' + energyValue + '" required><small class="field-hint">Ejemplo: 10 significa usar 10% menos kWh por unidad.</small>', true) +
      formField("Mejora de agua por unidad (%)", "target-water", '<input name="water" id="target-water" type="number" min="1" max="99" step="1" value="' + waterValue + '" required><small class="field-hint">Ejemplo: 10 significa usar 10% menos m³ por unidad.</small>', true);
    openModal("Define tus metas propias", "Elige un porcentaje de mejora para energía y agua.", modalForm("environment-target-form", fields, "La comparación usa el promedio de tus últimos tres meses anteriores con consumo y producción. No es un mínimo universal ni un requisito ambiental.", "Guardar metas"));
  }

  function submitEnvironmentTargets(form) {
    var energy = Number(form.elements.energy.value);
    var water = Number(form.elements.water.value);
    if (!Number.isInteger(energy) || energy < 1 || energy > 99 || !Number.isInteger(water) || water < 1 || water > 99) {
      return toast("Revisa los porcentajes", "Cada meta debe estar entre 1% y 99%.");
    }
    state.environmentTargets = { energyReductionPct: energy, waterReductionPct: water };
    saveState();
    closeModal();
    render();
    toast("Metas guardadas", "Son objetivos propios de mejora de tu empresa.");
  }

  function openManualEnvironmentModal() {
    var record = currentEnvironment();
    var fields = formField("Energía de la factura (kWh)", "energy", '<input name="energy" id="energy" type="number" min="0" step="1" value="' + (record.electricityKwh || "") + '" placeholder="Ej. 1.250">') +
      formField("Agua consumida (m³)", "water", '<input name="water" id="water" type="number" min="0" step="0.1" value="' + (record.waterM3 || "") + '" placeholder="Ej. 42">') +
      formField("Combustible (litros)", "fuel", '<input name="fuel" id="fuel" type="number" min="0" step="0.1" value="' + (record.fuelL || "") + '" placeholder="Ej. 35">') +
      formField("Unidades producidas", "units", '<input name="units" id="units" type="number" min="0" step="1" value="' + (record.productionUnits || "") + '" placeholder="Ej. 1.100">') +
      formField("Residuos orgánicos (kg)", "organic", '<input name="organic" id="organic" type="number" min="0" step="0.1" value="' + (record.organicKg || "") + '">') +
      formField("Material aprovechable (kg)", "recyclable", '<input name="recyclable" id="recyclable" type="number" min="0" step="0.1" value="' + (record.recyclableKg || "") + '">') +
      formField("No aprovechables (kg)", "nonrecyclable", '<input name="nonrecyclable" id="nonrecyclable" type="number" min="0" step="0.1" value="' + (record.nonRecyclableKg || "") + '">') +
      formField("Residuos peligrosos (kg)", "hazardous", '<input name="hazardous" id="hazardous" type="number" min="0" step="0.1" value="' + (record.hazardousKg || "") + '">') +
      formField("Reciclado o reutilizado (kg)", "recycled", '<input name="recycled" id="recycled" type="number" min="0" step="0.1" value="' + (record.recycledKg || "") + '">');
    openModal("Registrar datos del mes", "Puedes encontrarlos en las facturas, medidores o registros de producción.", modalForm("environment-form", fields, "Los valores se guardan para " + monthName(currentPeriod) + ". Las emisiones de esta demostración usan factores ilustrativos.", "Guardar datos"));
  }

  function openEnvironmentExample() {
    receiptSession = {
      type: "energy", period: "2026-10", consumption: 1284, unit: "kWh", confidence: 1,
      periodConfidence: 1, method: "ejemplo", sourceLabel: "Ejemplo demostrativo", warnings: [],
      demoImage: "vendor/receipt-reader/sample-energy-receipt.svg",
      textPreview: "RECIBO DE ENERGÍA · Período de consumo: octubre 2026 · Consumo facturado: 1.284 kWh"
    };
    openReceiptReview();
  }

  function openReceiptReview() {
    var receipt = receiptSession;
    if (!receipt) return;
    var warning = receipt.warnings && receipt.warnings.length ? '<div class="receipt-warning"><strong>Revisa antes de guardar</strong><ul>' + receipt.warnings.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join("") + '</ul></div>' : '';
    var quality = receipt.warnings && receipt.warnings.length ? '<span class="status pending">Requiere revisión</span>' : '<span class="status">Texto detectado · ' + esc(receipt.method || "lectura local") + '</span>';
    var note = receipt.method === "ejemplo" ? '<span class="status neutral">Datos de demostración</span>' : quality;
    var demoReceipt = receipt.demoImage ? '<div class="demo-receipt"><img src="' + esc(receipt.demoImage) + '" alt="Recibo ficticio de energía con consumo de 1.284 kWh"><small>Documento ficticio · no es una factura real</small></div>' : "";
    var content = '<form class="modal-form" id="receipt-review-form"><div class="receipt-review-intro">' + note + '<p>Confirma o corrige los campos. Pyme360 guardará solo los valores confirmados, no el archivo.</p></div>' + warning +
      '<div class="form-grid">' +
      formField("Servicio", "receipt-type", '<select name="type" id="receipt-type"><option value="energy"' + (receipt.type === "energy" ? " selected" : "") + '>Energía (kWh)</option><option value="water"' + (receipt.type === "water" ? " selected" : "") + '>Agua (m³)</option></select>', true) +
      formField("Mes del consumo", "receipt-period", '<input name="period" id="receipt-period" type="month" required value="' + esc(receipt.period || currentPeriod) + '">', false) +
      formField("Consumo del recibo", "receipt-consumption", '<input name="consumption" id="receipt-consumption" type="number" min="0" step="any" required value="' + (Number(receipt.consumption) > 0 ? String(receipt.consumption) : "") + '" placeholder="Escribe el valor si no se detectó">', false) +
      formField("Unidad", "receipt-unit", '<input id="receipt-unit" type="text" readonly value="' + (receipt.type === "water" ? "m³" : "kWh") + '">', false) +
      '</div>' +
      demoReceipt +
      '<details class="receipt-preview"><summary>Ver texto leído</summary><p>' + esc((receipt.textPreview || "No se pudo extraer texto del documento.").slice(0, 1400)) + '</p></details>' +
      '<div class="form-note">Origen: ' + esc(receipt.sourceLabel || "Recibo cargado") + ' · Método: ' + esc(receipt.method || "lectura local") + '. La lectura automática puede equivocarse; compárala con tu factura.</div>' +
      '<div class="modal-footer"><button type="button" class="button button-secondary" data-action="close-modal">Cancelar</button><button type="submit" class="button button-primary">Confirmar y guardar</button></div></form>';
    openModal("Revisa los datos del recibo", "Comprobemos lo que encontramos antes de actualizar el mes.", content);
  }

  async function processEnvironmentReceipt(file) {
    if (!file) return;
    var readToken = { cancelled: false, worker: null };
    activeReceiptRead = readToken;
    openModal("Leyendo recibo…", "El archivo se procesa en este dispositivo. Esto puede tardar unos segundos.", '<div class="modal-form"><div class="receipt-progress"><span class="receipt-progress-bar" id="receipt-progress-bar"></span></div><p id="receipt-progress-label">Preparando lectura…</p><div class="modal-footer"><button type="button" class="button button-quiet" data-action="close-modal">Cancelar</button></div></div>');
    try {
      if (!window.Pyme360ReceiptReader) throw new Error("No se cargó el lector de recibos local. Recarga la página e inténtalo de nuevo.");
      var result = await window.Pyme360ReceiptReader.read(file, function (progress) {
        if (readToken.cancelled) return;
        var label = document.getElementById("receipt-progress-label");
        var bar = document.getElementById("receipt-progress-bar");
        if (label) label.textContent = progress.label || "Leyendo documento…";
        if (bar) bar.style.width = Math.max(4, Math.min(100, progress.percent || 4)) + "%";
      }, readToken);
      if (readToken.cancelled || activeReceiptRead !== readToken) return;
      activeReceiptRead = null;
      receiptSession = result;
      openReceiptReview();
    } catch (error) {
      if (readToken.cancelled || activeReceiptRead !== readToken) return;
      activeReceiptRead = null;
      var readerError = error.message || "El archivo no se pudo procesar.";
      if (window.location.protocol === "file:") {
        readerError = "El archivo se eligió correctamente, pero al abrir index.html directamente el navegador puede bloquear el lector automático. No se guardó ningún dato.";
      }
      openModal("No pudimos leer el recibo", esc(readerError),
        '<div class="modal-form"><p>Puedes intentar con una foto más clara o escribir el consumo manualmente. No se guardó ningún dato.</p><div class="modal-footer"><button type="button" class="button button-secondary" data-action="close-modal">Cerrar</button><button type="button" class="button button-primary" data-action="environment-manual">Ingresar manualmente</button></div></div>');
    } finally {
      if (activeReceiptRead === readToken) activeReceiptRead = null;
      file = null;
    }
  }

  function submitReceiptReview(form) {
    var period = form.elements.period.value;
    var rawAmount = form.elements.consumption.value.trim();
    var amount = Number(rawAmount);
    var type = form.elements.type.value;
    if (!/^\d{4}-\d{2}$/.test(period) || !rawAmount || !Number.isFinite(amount) || amount < 0 || ["energy", "water"].indexOf(type) < 0) {
      return toast("Revisa el período y el consumo", "Confirma una fecha válida y una cantidad de cero o más.");
    }
    var nextState;
    try { nextState = JSON.parse(JSON.stringify(state)); }
    catch (error) { return toast("No se pudo preparar el registro", "Cierra otras pestañas e inténtalo de nuevo."); }
    var record = nextState.environment.find(function (item) { return item.period === period; });
    if (!record) {
      record = { period: period, electricityKwh: 0, waterM3: 0, fuelL: 0, organicKg: 0, recyclableKg: 0, nonRecyclableKg: 0, hazardousKg: 0, recycledKg: 0, productionUnits: 0, readingSources: {} };
      nextState.environment.push(record);
    }
    if (!record.readingSources) record.readingSources = {};
    var field = type === "energy" ? "electricityKwh" : "waterM3";
    record[field] = amount;
    var original = receiptSession || {};
    var key = type === "energy" ? "energy" : "water";
    record.readingSources[key] = {
      label: original.sourceLabel || "Recibo confirmado",
      method: original.method || "lectura local",
      confidence: Number(original.confidence) || 0,
      confirmedAt: new Date().toISOString()
    };
    var sourcePrefix = type === "energy" ? "energy" : "water";
    record[sourcePrefix + "Source"] = record.readingSources[key].label;
    record[sourcePrefix + "Method"] = record.readingSources[key].method;
    record[sourcePrefix + "CapturedAt"] = record.readingSources[key].confirmedAt;
    nextState.activity.unshift({ text: "Consumo confirmado desde recibo", detail: monthName(period) + " " + period.slice(0, 4) + " · " + amount + " " + (type === "energy" ? "kWh" : "m³"), time: "Ahora", icon: "♧" });
    nextState.activity = nextState.activity.slice(0, 8);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      state = nextState;
    } catch (error) {
      return toast("No se pudo guardar", "El navegador no tiene espacio. No se aplicó el cambio; descarga un Excel e inténtalo de nuevo.");
    }
    currentPeriod = period;
    receiptSession = null;
    closeModal();
    render();
    toast("Consumo confirmado", "Guardamos el valor y el origen, sin conservar el recibo.");
  }

  function openPurchaseModal() {
    var hasSupplier = state.contacts.some(function (item) { return item.role.indexOf("Proveedor") >= 0; });
    var hasMaterial = state.inventory.some(function (item) { return item.type === "Materia prima" || item.type === "Insumo"; });
    if (!hasSupplier || !hasMaterial) {
      return openModal("Completa estos datos primero", "Para registrar una compra necesitas un proveedor y un producto de inventario.", '<div class="modal-form"><div class="modal-footer">' +
        (!hasSupplier ? '<button class="button button-secondary" data-page="contacts">Agregar proveedor</button>' : '') +
        (!hasMaterial ? '<button class="button button-primary" data-action="new-product">Agregar materia prima</button>' : '') +
        '<button class="button button-quiet" data-action="close-modal">Cerrar</button></div></div>');
    }
    var fields = formField("Proveedor", "purchase-supplier", '<select name="supplier" id="purchase-supplier" required><option value="">Selecciona proveedor</option>' + contactOptions("Proveedor") + '</select>', true) +
      formField("Producto recibido", "purchase-product", '<select name="product" id="purchase-product" required>' + productOptions(["Materia prima", "Insumo"]) + '</select>', true) +
      formField("Cantidad", "purchase-quantity", '<input name="quantity" id="purchase-quantity" type="number" min="0.1" step="0.1" value="10" required>') +
      formField("Costo total (COP)", "purchase-total", '<input name="total" id="purchase-total" type="number" min="0" step="1000" value="100000" required>') +
      formField("Estado", "purchase-status", '<select name="status" id="purchase-status"><option>Recibida</option><option>Por recibir</option></select>');
    openModal("Registrar una compra", "Registra lo recibido y actualiza las existencias.", modalForm("purchase-form", fields, "Esta acción crea un registro local de compra. Revisa la factura original con tu contador.", "Guardar compra"));
  }

  function openContactModal() {
    var fields = formField("Nombre o razón social", "contact-name", '<input name="name" id="contact-name" required placeholder="Ej. Distribuciones del Norte" maxlength="100">', true) +
      formField("Tipo de contacto", "contact-kind", '<select name="role" id="contact-kind"><option>Cliente</option><option>Proveedor</option><option>Cliente y proveedor</option></select>') +
      formField("Identificación (NIT o cédula)", "contact-idnumber", '<input name="idNumber" id="contact-idnumber" placeholder="Ej. 900.123.456-7">') +
      formField("Correo electrónico", "contact-email", '<input name="email" id="contact-email" type="email" placeholder="correo@empresa.co">') +
      formField("Teléfono", "contact-phone", '<input name="phone" id="contact-phone" type="tel" placeholder="300 000 0000">');
    openModal("Nuevo contacto", "Guarda los datos que necesitas para vender o comprar.", modalForm("contact-form", fields, "Puedes completar los datos tributarios más adelante.", "Guardar contacto"));
  }

  function openSetupModal() {
    var fields = formField("Nombre o razón social", "setup-company", '<input name="company" id="setup-company" value="' + esc(state.company) + '" required maxlength="100">', true) +
      formField("NIT", "setup-nit", '<input name="nit" id="setup-nit" value="' + esc(state.companyNit || "") + '" placeholder="Ej. 900.123.456-7">') +
      formField("Ciudad principal", "setup-city", '<input name="city" id="setup-city" value="' + esc(state.city || "") + '" placeholder="Ej. Bogotá">') +
      formField("Actividad", "setup-activity", '<select name="activity" id="setup-activity"><option>Alimentos y bebidas</option><option>Textiles y confección</option><option>Metalmecánica</option><option>Cosmética y cuidado personal</option><option>Otra manufactura</option></select>') +
      '<div class="field full"><label>Primeros pasos</label><div class="form-note" style="margin:0">1. Datos de empresa · 2. Sede y bodega · 3. Productos e inventario · 4. Impuestos y facturación.</div></div>';
    openModal("Configura tu negocio", "Empecemos con lo básico. Puedes completar el resto después.", modalForm("setup-form", fields, "Los datos de esta pantalla solo se guardan en este navegador de demostración.", "Guardar y continuar"));
  }

  function openAdjustmentModal() {
    if (!state.inventory.length) return openProductModal();
    var fields = formField("Producto", "adjust-product", '<select name="product" id="adjust-product" required>' + productOptions(null) + '</select>', true) +
      formField("Cambio en existencia (+ / −)", "adjust-quantity", '<input name="quantity" id="adjust-quantity" type="number" step="0.1" required placeholder="Ej. 5 o -2">') +
      formField("Motivo", "adjust-reason", '<select name="reason" id="adjust-reason"><option>Conteo de inventario</option><option>Producto dañado</option><option>Corrección de registro</option><option>Otro</option></select>');
    openModal("Ajustar existencias", "Registra una diferencia de inventario con su motivo.", modalForm("adjust-form", fields, "El ajuste quedará registrado en la actividad reciente.", "Guardar ajuste"));
  }

  function openProductModal() {
    var materials = productOptions(["Materia prima", "Insumo"]);
    var fields = formField("Nombre del producto o material", "product-name", '<input name="name" id="product-name" required maxlength="100" placeholder="Ej. Harina de maíz">', true) +
      formField("Tipo", "product-type", '<select name="type" id="product-type"><option>Materia prima</option><option>Insumo</option><option>Producto terminado</option></select>') +
      formField("Unidad", "product-unit", '<select name="unit" id="product-unit"><option>kg</option><option>unidad</option><option>litro</option><option>m³</option><option>caja</option><option>metro</option></select>') +
      formField("Existencia inicial", "product-stock", '<input name="stock" id="product-stock" type="number" min="0" step="0.1" value="0">') +
      formField("Avisarme al llegar a", "product-min", '<input name="min" id="product-min" type="number" min="0" step="0.1" value="0">') +
      formField("Costo por unidad (COP)", "product-cost", '<input name="cost" id="product-cost" type="number" min="0" step="100" value="0">') +
      formField("Precio de venta (COP)", "product-price", '<input name="price" id="product-price" type="number" min="0" step="100" value="0">') +
      formField("IVA", "product-tax-type", '<select name="taxType" id="product-tax-type"><option>Gravado</option><option>Excluido</option><option>Exento</option></select>') +
      formField("Tarifa IVA (%)", "product-tax-rate", '<input name="taxRate" id="product-tax-rate" type="number" min="0" max="100" step="1" value="19">') +
      formField("Material por unidad (solo producto terminado)", "product-material", '<select name="material" id="product-material"><option value="">Sin receta por ahora</option>' + materials + '</select>', true) +
      formField("Cantidad de ese material", "product-material-amount", '<input name="materialAmount" id="product-material-amount" type="number" min="0.001" step="0.001" placeholder="Ej. 0,25">');
    openModal("Agregar producto", "Registra tus propios productos, materias primas o insumos.", modalForm("product-form", fields, "Si vas a fabricar este producto, agrega primero sus materiales. Puedes dejar la receta vacía y completarla más adelante.", "Guardar producto"));
  }

  function openPaymentModal() {
    var unpaid = state.sales.filter(function (sale) { return sale.status === "Pendiente de pago"; });
    if (!unpaid.length) return toast("No tienes facturas pendientes", "Cuando registres una venta a crédito, podrás asociar el pago aquí.");
    var options = unpaid.map(function (sale) { return '<option value="' + esc(sale.id) + '">' + esc(sale.number) + " · " + esc(sale.customer) + " · " + money(sale.total) + '</option>'; }).join("");
    var fields = formField("Factura", "payment-sale", '<select name="sale" id="payment-sale">' + options + '</select>', true) +
      formField("Fecha de pago", "payment-date", '<input name="date" id="payment-date" type="date" value="' + today() + '">') +
      formField("Medio de pago", "payment-method", '<select name="method" id="payment-method"><option>Transferencia</option><option>Efectivo</option><option>Consignación</option><option>Otro</option></select>');
    openModal("Registrar un pago", "Asocia el pago recibido a una factura pendiente.", modalForm("payment-form", fields, "El pago quedará asociado al registro de venta.", "Confirmar pago"));
  }

  /* Guardado de operaciones */
  function submitSale(form) {
    var product = state.inventory.find(function (item) { return item.id === form.elements.product.value; });
    var customer = state.contacts.find(function (item) { return item.id === form.elements.customer.value; });
    var quantity = Number(form.elements.quantity.value);
    var discount = Number(form.elements.discount.value) || 0;
    if (!product || !customer) return toast("Revisa los datos", "Elige un cliente y un producto.");
    if (quantity > product.stock) return toast("No hay suficientes existencias", "Tienes " + num(product.stock) + " " + product.unit + " disponibles.");
    var subtotal = Math.max(0, product.price * quantity - discount);
    var rate = product.taxType === "Gravado" ? Number(product.taxRate) || 0 : 0;
    var maxInvoice = state.sales.reduce(function (max, item) { var value = Number(String(item.number).replace(/\D/g, "")); return Math.max(max, value || 0); }, 0);
    var sale = {
      id: "v" + Date.now(), number: "FV-" + String(maxInvoice + 1).padStart(4, "0"),
      customer: customer.name, date: form.elements.date.value || today(),
      total: Math.round(subtotal * (1 + rate / 100)), taxRate: rate,
      status: form.elements.payment.value === "Contado" ? "Pagada" : "Pendiente de pago",
      payment: form.elements.payment.value, lines: [{ sku: product.sku, quantity: quantity }], demo: true
    };
    product.stock -= quantity;
    state.sales.unshift(sale);
    addActivity("Venta registrada", sale.number + " · " + customer.name, "↗");
    saveState();
    closeModal();
    render();
    toast("Venta guardada", sale.number + " · No se transmitió a la DIAN.");
  }

  function submitProduction(form) {
    var product = state.inventory.find(function (item) { return item.id === form.elements.product.value; });
    var quantity = Number(form.elements.quantity.value);
    var waste = Number(form.elements.waste.value) || 0;
    if (!product) return toast("Elige un producto", "Selecciona qué vas a fabricar.");
    var required = (product.inputs || []).map(function (input) {
      var material = state.inventory.find(function (item) { return item.sku === input.sku; });
      return { item: material, amount: input.amount * quantity };
    });
    var short = required.find(function (entry) { return !entry.item || entry.item.stock < entry.amount; });
    if (short) return toast("Faltan materiales", short.item ? "No alcanza " + short.item.name + " para esta orden." : "Revisa la receta del producto.");
    required.forEach(function (entry) { entry.item.stock -= entry.amount; });
    var order = {
      id: "pr" + Date.now(), number: "OP-" + String(82 + state.production.length).padStart(4, "0"),
      product: product.name, productId: product.id, quantity: quantity, date: today(),
      status: "En proceso", wasteKg: waste, inputConsumption: required.map(function (entry) {
        return { sku: entry.item.sku, quantity: entry.amount };
      })
    };
    state.production.unshift(order);
    addActivity("Orden de producción creada", order.number + " · " + quantity + " unidades", "⚙");
    saveState();
    closeModal();
    render();
    toast("Orden creada", order.number + " · Los materiales se descontaron del inventario.");
  }

  function completeProduction(id) {
    var order = state.production.find(function (item) { return item.id === id; });
    if (!order || order.status !== "En proceso") return;
    var product = state.inventory.find(function (item) { return item.id === order.productId; }) ||
      state.inventory.find(function (item) { return item.name === order.product; });
    if (!product) return toast("No se encontró el producto terminado");
    product.stock += order.quantity;
    order.status = "Terminada";
    order.completedDate = today();
    var record = currentEnvironment();
    record.productionUnits += order.quantity;
    record.nonRecyclableKg += Number(order.wasteKg) || 0;
    upsertEnvironment(record);
    addActivity("Orden de producción terminada", order.number + " · " + order.quantity + " unidades", "⚙");
    saveState();
    closeModal();
    render();
    toast("Orden terminada", "El producto terminado ya está disponible en inventario.");
  }

  function submitEnvironment(form) {
    var record = currentEnvironment();
    var energy = Number(form.elements.energy.value) || 0;
    var water = Number(form.elements.water.value) || 0;
    if (!record.readingSources) record.readingSources = {};
    if (energy !== Number(record.electricityKwh)) {
      record.readingSources.energy = { label: "Registro manual", method: "manual", confidence: 1, confirmedAt: new Date().toISOString() };
      record.energySource = "Registro manual"; record.energyMethod = "manual"; record.energyCapturedAt = record.readingSources.energy.confirmedAt;
    }
    if (water !== Number(record.waterM3)) {
      record.readingSources.water = { label: "Registro manual", method: "manual", confidence: 1, confirmedAt: new Date().toISOString() };
      record.waterSource = "Registro manual"; record.waterMethod = "manual"; record.waterCapturedAt = record.readingSources.water.confirmedAt;
    }
    record.electricityKwh = energy;
    record.waterM3 = water;
    record.fuelL = Number(form.elements.fuel.value) || 0;
    record.productionUnits = Number(form.elements.units.value) || record.productionUnits || 0;
    record.organicKg = Number(form.elements.organic.value) || 0;
    record.recyclableKg = Number(form.elements.recyclable.value) || 0;
    record.nonRecyclableKg = Number(form.elements.nonrecyclable.value) || 0;
    record.hazardousKg = Number(form.elements.hazardous.value) || 0;
    record.recycledKg = Number(form.elements.recycled.value) || 0;
    upsertEnvironment(record);
    addActivity("Datos ambientales actualizados", monthName(currentPeriod) + " · consumos y residuos", "♧");
    saveState();
    closeModal();
    render();
    toast("Datos ambientales guardados", "Ya puedes revisar el resumen y las recomendaciones del mes.");
  }

  function submitPurchase(form) {
    var supplier = state.contacts.find(function (item) { return item.id === form.elements.supplier.value; });
    var product = state.inventory.find(function (item) { return item.id === form.elements.product.value; });
    var quantity = Number(form.elements.quantity.value);
    if (!supplier || !product) return toast("Revisa los datos", "Selecciona un proveedor y un producto.");
    var status = form.elements.status.value;
    if (status === "Recibida") product.stock += quantity;
    var purchase = { id: "co" + Date.now(), number: "OC-" + String(239 + state.purchases.length).padStart(4, "0"), supplier: supplier.name, date: today(), total: Number(form.elements.total.value) || 0, status: status, detail: product.name + " · " + num(quantity, 1) + " " + product.unit, productSku: product.sku, quantity: quantity };
    state.purchases.unshift(purchase);
    addActivity(status === "Recibida" ? "Compra recibida" : "Compra registrada", purchase.number + " · " + product.name, "↙");
    saveState();
    closeModal();
    render();
    toast("Compra guardada", status === "Recibida" ? "Las existencias se actualizaron." : "Quedó pendiente de recibir.");
  }

  function submitContact(form) {
    var name = form.elements.name.value.trim();
    if (!name) return toast("Escribe el nombre del contacto");
    state.contacts.unshift({
      id: "c" + Date.now(), name: name,
      role: form.elements.role.value === "Cliente y proveedor" ? "Cliente · Proveedor" : form.elements.role.value,
      idNumber: form.elements.idNumber.value.trim(), email: form.elements.email.value.trim(), phone: form.elements.phone.value.trim()
    });
    addActivity("Nuevo contacto", name, "♙");
    saveState();
    closeModal();
    render();
    toast("Contacto guardado", name + " ya está en tu lista.");
  }

  function submitSetup(form) {
    state.company = form.elements.company.value.trim();
    state.companyNit = form.elements.nit.value.trim();
    state.city = form.elements.city.value.trim();
    state.activityType = form.elements.activity.value;
    saveState();
    closeModal();
    render();
    toast("Datos básicos guardados", "Siguiente paso: revisar sedes, productos e impuestos.");
  }

  function submitProduct(form) {
    var name = form.elements.name.value.trim();
    var type = form.elements.type.value;
    var material = state.inventory.find(function (item) { return item.id === form.elements.material.value; });
    var amount = Number(form.elements.materialAmount.value) || 0;
    if (!name) return toast("Escribe el nombre del producto");
    if (type === "Producto terminado" && material && amount <= 0) return toast("Indica cuánto material usa", "Escribe la cantidad necesaria para fabricar una unidad.");
    var product = {
      id: "p" + Date.now(), sku: "REF-" + Date.now().toString().slice(-6), name: name,
      type: type, unit: form.elements.unit.value, stock: Number(form.elements.stock.value) || 0,
      min: Number(form.elements.min.value) || 0, cost: Number(form.elements.cost.value) || 0,
      price: Number(form.elements.price.value) || 0, taxType: form.elements.taxType.value,
      taxRate: Number(form.elements.taxRate.value) || 0,
      inputs: type === "Producto terminado" && material && amount > 0 ? [{ sku: material.sku, amount: amount }] : []
    };
    state.inventory.unshift(product);
    addActivity("Producto agregado", product.name + " · " + product.type, "▦");
    saveState();
    closeModal();
    render();
    toast("Producto guardado", product.name + " ya está en tu inventario.");
  }

  function submitAdjustment(form) {
    var item = state.inventory.find(function (entry) { return entry.id === form.elements.product.value; });
    var quantity = Number(form.elements.quantity.value);
    if (!item || !quantity) return toast("Revisa la cantidad", "Escribe el ajuste que necesitas registrar.");
    if (item.stock + quantity < 0) return toast("El ajuste no puede dejar stock negativo");
    item.stock += quantity;
    addActivity("Existencias ajustadas", item.name + " · " + (quantity > 0 ? "+" : "") + num(quantity, 1) + " " + item.unit + " · " + form.elements.reason.value, "▦");
    saveState();
    closeModal();
    render();
    toast("Existencias actualizadas", "El cambio quedó guardado en este dispositivo.");
  }

  function submitPayment(form) {
    var sale = state.sales.find(function (item) { return item.id === form.elements.sale.value; });
    if (!sale) return;
    sale.status = "Pagada";
    sale.paidDate = form.elements.date.value;
    sale.method = form.elements.method.value;
    addActivity("Pago registrado", sale.number + " · " + sale.customer, "$");
    saveState();
    closeModal();
    render();
    toast("Pago registrado", "La factura " + sale.number + " quedó marcada como pagada.");
  }

  /* Exportación y detalles */
  function exportCsv(filename, rows) {
    var csv = rows.map(function (row) {
      return row.map(function (cell) { return '"' + String(cell == null ? "" : cell).replace(/"/g, '""') + '"'; }).join(",");
    }).join("\r\n");
    var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast("Archivo preparado", "Tu archivo CSV se descargó en el dispositivo.");
  }

  function exportEnvironment() {
    var rows = [["Periodo", "Energia (kWh)", "Agua (m3)", "Combustible (L)", "Produccion (unidades)", "Organicos (kg)", "Aprovechables (kg)", "No aprovechables (kg)", "Peligrosos (kg)", "Reciclado o reutilizado (kg)", "Emisiones estimadas demo (kg CO2e)", "Fuente del factor"]];
    state.environment.slice().sort(function (a, b) { return a.period.localeCompare(b.period); }).forEach(function (record) {
      rows.push([record.period, record.electricityKwh, record.waterM3, record.fuelL, record.productionUnits, record.organicKg, record.recyclableKg, record.nonRecyclableKg, record.hazardousKg, record.recycledKg, Math.round(estimateEmissions(record)), "Factor ilustrativo de demostración; reemplazar por factor oficial"]);
    });
    exportCsv("pyme360-impacto-ambiental.csv", rows);
  }

  function toast(title, detail) {
    var region = document.getElementById("toast-region");
    var element = document.createElement("div");
    element.className = "toast";
    element.innerHTML = esc(title) + (detail ? "<small>" + esc(detail) + "</small>" : "");
    region.appendChild(element);
    window.setTimeout(function () { element.remove(); }, 3600);
  }

  function showDetails(action, id) {
    var item;
    var title = "Detalle";
    var body = "";
    if (action === "sale-detail") {
      item = state.sales.find(function (entry) { return entry.id === id; });
      if (!item) return;
      title = "Venta " + item.number;
      body = '<p><strong>Cliente:</strong> ' + esc(item.customer) + '</p><p><strong>Total:</strong> ' + money(item.total) + '</p><p><strong>Estado:</strong> ' + esc(item.status) + '</p><p><strong>Pago:</strong> ' + esc(item.payment) + '</p><p class="form-note">Registro local de demostración. No se ha transmitido a la DIAN.</p>';
    } else if (action === "purchase-detail") {
      item = state.purchases.find(function (entry) { return entry.id === id; });
      if (!item) return;
      title = "Compra " + item.number;
      body = '<p><strong>Proveedor:</strong> ' + esc(item.supplier) + '</p><p><strong>Detalle:</strong> ' + esc(item.detail) + '</p><p><strong>Total:</strong> ' + money(item.total) + '</p><p><strong>Estado:</strong> ' + esc(item.status) + '</p>';
    } else if (action === "production-detail") {
      item = state.production.find(function (entry) { return entry.id === id; });
      if (!item) return;
      title = "Orden " + item.number;
      body = '<p><strong>Producto:</strong> ' + esc(item.product) + '</p><p><strong>Cantidad planeada:</strong> ' + num(item.quantity) + ' unidades</p><p><strong>Desperdicio informado:</strong> ' + num(item.wasteKg, 1) + ' kg</p><p><strong>Estado:</strong> ' + esc(item.status) + '</p>' + (item.status === "En proceso" ? '<div class="modal-footer"><button class="button button-primary" data-action="production-complete" data-id="' + esc(item.id) + '">Marcar como terminada</button></div>' : "");
    } else if (action === "contact-detail") {
      item = state.contacts.find(function (entry) { return entry.id === id; });
      if (!item) return;
      title = item.name;
      body = '<p><strong>Tipo:</strong> ' + esc(item.role) + '</p><p><strong>Identificación:</strong> ' + esc(item.idNumber || "Sin registrar") + '</p><p><strong>Correo:</strong> ' + esc(item.email || "Sin registrar") + '</p><p><strong>Teléfono:</strong> ' + esc(item.phone || "Sin registrar") + '</p>';
    }
    openModal(title, "Información guardada en esta demostración.", '<div class="modal-form">' + body + '<div class="modal-footer"><button class="button button-primary" data-action="close-modal">Listo</button></div></div>');
  }

  /* Eventos globales */
  document.addEventListener("click", function (event) {
    var pageButton = event.target.closest("[data-page]");
    if (pageButton) {
      event.preventDefault();
      setPage(pageButton.getAttribute("data-page"));
      return;
    }
    var button = event.target.closest("[data-action]");
    if (!button) return;
    var action = button.getAttribute("data-action");
    if (action === "new-sale") openSaleModal();
    else if (action === "new-product") openProductModal();
    else if (action === "new-production") openProductionModal();
    else if (action === "new-environment") openEnvironmentModal();
    else if (action === "environment-set-target") openEnvironmentTargetsModal();
    else if (action === "environment-retry-reference") loadPublicBenchmark(true);
    else if (action === "environment-pick-receipt") {
      var receiptInput = document.getElementById("environment-receipt-file");
      if (receiptInput) receiptInput.click();
    }
    else if (action === "environment-example") openEnvironmentExample();
    else if (action === "environment-manual") openManualEnvironmentModal();
    else if (action === "new-purchase") openPurchaseModal();
    else if (action === "new-contact") openContactModal();
    else if (action === "new-adjustment") openAdjustmentModal();
    else if (action === "new-payment") openPaymentModal();
    else if (action === "setup") openSetupModal();
    else if (action === "theme-toggle") setTheme(currentTheme === "dark" ? "light" : "dark");
    else if (action === "sidebar-toggle") setSidebarCollapsed(!sidebarCollapsed);
    else if (action === "production-complete") completeProduction(button.getAttribute("data-id"));
    else if (action === "close-modal") closeModal();
    else if (action.indexOf("-detail") >= 0) showDetails(action, button.getAttribute("data-id"));
    else if (action === "environment-export") exportEnvironment();
    else if (action === "excel-download-master") {
      try { window.Pyme360Excel.downloadMaster(state); toast("Excel maestro preparado", "El archivo se descargó en este dispositivo."); }
      catch (error) { toast("No se pudo descargar el Excel", error.message || "Recarga la página e inténtalo de nuevo."); }
    }
    else if (action === "excel-download-template") {
      try { window.Pyme360Excel.downloadTemplate(); toast("Plantilla descargada", "Completa las hojas y luego impórtala desde Datos y Excel."); }
      catch (error) { toast("No se pudo descargar la plantilla", error.message || "Recarga la página e inténtalo de nuevo."); }
    }
    else if (action === "excel-select-file") {
      var fileInput = document.getElementById("excel-import-file");
      if (fileInput) fileInput.click();
    }
    else if (action === "excel-cancel-import") { importSession = null; render(); }
    else if (action === "excel-confirm-import") commitExcelImport();
    else if (action === "inventory-export") exportCsv("pyme360-inventario.csv", [["SKU", "Producto", "Tipo", "Existencia", "Unidad", "Minimo", "Costo unitario"]].concat(state.inventory.map(function (item) { return [item.sku, item.name, item.type, item.stock, item.unit, item.min, item.cost]; })));
    else if (action === "finance-export") exportCsv("pyme360-movimientos.csv", [["Documento", "Fecha", "Contacto", "Total COP", "Estado"]].concat(state.sales.map(function (sale) { return [sale.number, sale.date, sale.customer, sale.total, sale.status]; })));
    else if (action === "help") openModal("Ayuda Pyme360", "Una guía breve para empezar.", '<div class="modal-form"><p><strong>1. Registra tus contactos.</strong> Así tendrás a mano clientes y proveedores.</p><p><strong>2. Ajusta tus existencias.</strong> Carga productos, materias primas e insumos.</p><p><strong>3. Usa los atajos.</strong> Registra ventas, producción y datos ambientales desde el menú.</p><p class="form-note">Los datos de tu empresa se guardan en este navegador. Solo al abrir Pyme360 con el acceso local se consulta la serie pública ODS 7.3.1 de la ONU; tus datos no se envían.</p><div class="modal-footer"><button class="button button-primary" data-action="close-modal">Entendido</button></div></div>');
    else if (action === "profile") toast("Perfil de administrador", "La gestión de usuarios estará disponible en la versión conectada.");
    else if (action === "notifications") toast("Sin notificaciones nuevas", "Te avisaremos cuando haya algo que revisar.");
  });

  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (!form.id) return;
    event.preventDefault();
    if (form.id === "sale-form") submitSale(form);
    else if (form.id === "production-form") submitProduction(form);
    else if (form.id === "environment-form") submitEnvironment(form);
    else if (form.id === "environment-target-form") submitEnvironmentTargets(form);
    else if (form.id === "receipt-review-form") submitReceiptReview(form);
    else if (form.id === "purchase-form") submitPurchase(form);
    else if (form.id === "contact-form") submitContact(form);
    else if (form.id === "setup-form") submitSetup(form);
    else if (form.id === "adjust-form") submitAdjustment(form);
    else if (form.id === "payment-form") submitPayment(form);
    else if (form.id === "product-form") submitProduct(form);
  });

  document.addEventListener("input", function (event) {
    var filter = event.target.getAttribute("data-filter");
    if (!filter) {
      if (event.target.closest("#sale-form")) updateSalePreview();
      if (event.target.closest("#production-form")) updateProductionPreview();
      return;
    }
    var query = event.target.value.trim().toLocaleLowerCase("es-CO");
    var selector = filter === "sales" ? "#sales-rows tr" : filter === "inventory" ? "#inventory-rows tr" : "#contact-rows tr";
    document.querySelectorAll(selector).forEach(function (row) {
      row.classList.toggle("hidden", query && !row.textContent.toLocaleLowerCase("es-CO").includes(query));
    });
  });

  document.addEventListener("change", function (event) {
    if (event.target.id === "environment-receipt-file") {
      var receiptFile = event.target.files && event.target.files[0];
      if (receiptFile) processEnvironmentReceipt(receiptFile);
      event.target.value = "";
    } else if (event.target.id === "receipt-type") {
      var unit = document.getElementById("receipt-unit");
      if (unit) unit.value = event.target.value === "water" ? "m³" : "kWh";
      if (receiptSession && receiptSession.type !== event.target.value) {
        receiptSession.type = event.target.value;
        receiptSession.consumption = "";
        receiptSession.confidence = 0;
        receiptSession.sourceLabel = "Recibo revisado manualmente";
        receiptSession.method = "corrección manual";
        receiptSession.warnings = receiptSession.warnings || [];
        if (receiptSession.warnings.indexOf("Cambiaste el tipo de servicio. Escribe y confirma el consumo en la unidad seleccionada.") < 0) receiptSession.warnings.push("Cambiaste el tipo de servicio. Escribe y confirma el consumo en la unidad seleccionada.");
        var amountInput = document.getElementById("receipt-consumption");
        if (amountInput) amountInput.value = "";
      }
    } else if (event.target.id === "excel-import-file") {
      var selectedFile = event.target.files && event.target.files[0];
      if (selectedFile) startExcelImport(selectedFile);
      event.target.value = "";
    } else if (event.target.matches("[data-excel-entity]")) {
      var entitySheet = importSession && importSession.sheets[Number(event.target.getAttribute("data-excel-sheet"))];
      if (entitySheet) {
        importSession.openSheet = Number(event.target.getAttribute("data-excel-sheet"));
        configureImportSheet(importSession.openSheet, event.target.value, entitySheet.config.headerRow);
      }
      render();
    } else if (event.target.matches("[data-excel-header]")) {
      var headerSheetIndex = Number(event.target.getAttribute("data-excel-sheet"));
      var headerSheet = importSession && importSession.sheets[headerSheetIndex];
      if (headerSheet) {
        importSession.openSheet = headerSheetIndex;
        configureImportSheet(headerSheetIndex, headerSheet.config.entity, Number(event.target.value));
      }
      render();
    } else if (event.target.matches("[data-excel-map-field]")) {
      var mapSheetIndex = Number(event.target.getAttribute("data-excel-sheet"));
      var mapSheet = importSession && importSession.sheets[mapSheetIndex];
      if (mapSheet) {
        importSession.openSheet = mapSheetIndex;
        var fieldKey = event.target.getAttribute("data-excel-map-field");
        if (event.target.value === "") delete mapSheet.config.mapping[fieldKey];
        else mapSheet.config.mapping[fieldKey] = Number(event.target.value);
      }
      render();
    } else if (event.target.id === "excel-update-duplicates") {
      if (importSession) importSession.updateDuplicates = event.target.checked;
      render();
    } else if (event.target.id === "sales-status") {
      var status = event.target.value;
      document.querySelectorAll("#sales-rows tr").forEach(function (row) {
        row.classList.toggle("hidden", status !== "Todas" && !row.textContent.includes(status));
      });
    } else if (event.target.id === "inventory-type") {
      var type = event.target.value;
      document.querySelectorAll("#inventory-rows tr").forEach(function (row) {
        row.classList.toggle("hidden", type !== "Todos" && !row.textContent.includes(type));
      });
    } else if (event.target.id === "contact-role") {
      var role = event.target.value;
      document.querySelectorAll("#contact-rows tr").forEach(function (row) {
        row.classList.toggle("hidden", role !== "Todos" && !row.textContent.includes(role));
      });
    } else if (event.target.id === "environment-period") {
      currentPeriod = event.target.value;
      render();
    }
  });

  document.getElementById("mobile-menu").addEventListener("click", function () {
    document.getElementById("sidebar").classList.toggle("open");
  });
  document.getElementById("dismiss-banner").addEventListener("click", function () {
    document.querySelector(".demo-banner").classList.add("hidden");
  });

  return {
    init: function () {
      setTheme(currentTheme);
      setSidebarCollapsed(sidebarCollapsed);
      render();
      if (window.location.protocol !== "file:" && currentPage === "environment") loadPublicBenchmark(false);
    }
  };
})();
