(function () {
  "use strict";

  // v2 starts clean for each browser; legacy demo records remain untouched in v1.
  var STORAGE_KEY = "pyme360.demo.v2";
  var now = new Date();
  var currentPeriod = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  var pages = { overview: "Inicio", sales: "Ventas", purchases: "Compras", inventory: "Inventario", production: "Producción", finance: "Finanzas", environment: "Impacto ambiental", contacts: "Contactos" };
  var currentPage = "overview";
  var state = loadState();

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
      activity: []
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
      recyclableKg: 0, nonRecyclableKg: 0, hazardousKg: 0, recycledKg: 0, productionUnits: 0
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function render() {
    document.getElementById("page-title").textContent = pages[currentPage];
    document.querySelector(".company-switcher .company-meta strong").textContent = state.company || "Configura tu empresa";
    document.querySelector(".breadcrumb > span:first-child").textContent = state.company || "Tu empresa";
    document.querySelector(".company-avatar").textContent = state.company ? state.company.trim().charAt(0).toUpperCase() : "＋";
    document.getElementById("page-content").innerHTML = pageRenderer(currentPage)();
    document.querySelectorAll(".nav-item[data-page]").forEach(function (item) {
      item.classList.toggle("active", item.getAttribute("data-page") === currentPage);
    });
    var actions = {
      overview: ["Nueva venta", "new-sale"], sales: ["Nueva venta", "new-sale"],
      purchases: ["Registrar compra", "new-purchase"], inventory: ["Agregar producto", "new-product"],
      production: ["Nueva orden", "new-production"], finance: ["Registrar pago", "new-payment"],
      environment: ["Registrar datos", "new-environment"], contacts: ["Nuevo contacto", "new-contact"]
    };
    document.getElementById("top-create").innerHTML = "<span>＋</span> " + actions[currentPage][0];
    document.getElementById("top-create").setAttribute("data-action", actions[currentPage][1]);
    document.getElementById("sales-nav-count").textContent = String(state.sales.filter(function (sale) { return sale.status === "Pendiente de pago"; }).length);
  }

  function pageRenderer(page) {
    return {
      overview: renderOverview, sales: renderSales, purchases: renderPurchases,
      inventory: renderInventory, production: renderProduction, finance: renderFinance,
      environment: renderEnvironment, contacts: renderContacts
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

  function statusBadge(status, forcedStyle) {
    var style = forcedStyle || (status === "Pagada" || status === "Terminada" || status === "Recibida" ? "" :
      status === "Por recibir" || status === "Pendiente de pago" || status.indexOf("Pendiente") === 0 ? "pending" : "neutral");
    return '<span class="status ' + style + '">' + esc(status) + '</span>';
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
    var historic = state.environment.filter(function (item) { return item.period < currentPeriod; }).slice(-3);
    var avgEnergy = historic.length ? historic.reduce(function (sum, item) { return sum + item.electricityKwh; }, 0) / historic.length : 0;
    var increase = avgEnergy ? Math.round((record.electricityKwh - avgEnergy) / avgEnergy * 100) : 0;
    var periods = state.environment.slice().sort(function (a, b) { return b.period.localeCompare(a.period); });
    if (!periods.some(function (item) { return item.period === currentPeriod; })) periods.unshift({ period: currentPeriod });
    var options = periods.map(function (item) { return '<option value="' + esc(item.period) + '"' + (item.period === currentPeriod ? " selected" : "") + '>' + monthName(item.period) + " " + item.period.slice(0, 4) + '</option>'; }).join("");
    return heading("PRODUCE MEJOR, PASO A PASO", "Impacto ambiental", "Entiende tus consumos y encuentra oportunidades para producir mejor.", '<select class="filter-select" id="environment-period">' + options + '</select><button class="button button-primary" data-action="new-environment"><span>＋</span> Registrar datos</button>') +
      '<div class="env-highlight"><div class="env-leaf">♧</div><div class="env-highlight-main"><div class="eyebrow">RESUMEN DE ' + monthName(currentPeriod).toUpperCase() + '</div><h2>' + (periodRecorded ? "Cada dato cuenta. Revisa tu avance." : "Aún no hay datos ambientales del mes.") + '</h2><p>' + (periodRecorded ? "Compara tus consumos, registra lo que falta y convierte los datos en acciones sencillas." : "Empieza con la factura de energía, el recibo de agua y tus registros de producción.") + '</p></div><button class="button" data-action="environment-export">↓ Descargar resumen</button></div>' +
      '<div class="env-grid">' + envMetric("Energía", num(record.electricityKwh) + " kWh", "Consumo de la sede", "ϟ") + envMetric("Agua", num(record.waterM3, 1) + " m³", "Agua consumida", "◌") + envMetric("Emisiones estimadas", num(emissions / 1000, 2) + " tCO₂e", "Cálculo demostrativo", "♧") + envMetric("Residuos aprovechados", rate + "%", num(record.recycledKg, 1) + " kg reutilizados o reciclados", "↻") + '</div>' +
      '<div class="env-layout"><div class="panel"><div class="panel-header"><div><h2>Consumo y producción</h2><p>Registra el dato de tu factura y compáralo con lo que produces.</p></div><span class="status neutral">' + (record.electricityKwh && record.waterM3 ? "Datos registrados" : "Datos incompletos") + '</span></div><div class="panel-body"><div class="table-wrap"><table><thead><tr><th>INDICADOR</th><th>VALOR DEL MES</th><th>POR UNIDAD</th><th>COMPARACIÓN</th></tr></thead><tbody>' +
      '<tr><td><strong>Energía</strong><small>Electricidad comprada</small></td><td>' + num(record.electricityKwh) + ' kWh</td><td>' + (record.productionUnits ? num(record.electricityKwh / record.productionUnits, 2) : "—") + ' kWh / unidad</td><td>' + (increase > 0 ? '<span class="status pending">+' + increase + '%</span>' : '<span class="status">En seguimiento</span>') + '</td></tr>' +
      '<tr><td><strong>Agua</strong><small>Consumo de la sede</small></td><td>' + num(record.waterM3, 1) + ' m³</td><td>' + (record.productionUnits ? num(record.waterM3 / record.productionUnits, 3) : "—") + ' m³ / unidad</td><td><span class="status neutral">Registrar cada mes</span></td></tr>' +
      '<tr><td><strong>Combustibles</strong><small>Uso reportado</small></td><td>' + num(record.fuelL, 1) + ' L</td><td>' + (record.productionUnits ? num(record.fuelL / record.productionUnits, 3) : "—") + ' L / unidad</td><td><span class="status neutral">Dato manual</span></td></tr>' +
      '<tr><td><strong>Residuos</strong><small>Todos los tipos</small></td><td>' + num(totalWaste, 1) + ' kg</td><td>' + (record.productionUnits ? num(totalWaste / record.productionUnits, 3) : "—") + ' kg / unidad</td><td><span class="status">' + num(record.recycledKg, 1) + ' kg aprovechados</span></td></tr></tbody></table></div><p class="muted-note section-spacer">Las emisiones son estimaciones ilustrativas. Configura factores oficiales con tu asesor antes de usarlas para reportes formales.</p></div></div>' +
      '<div class="panel"><div class="panel-header"><div><h2>Ideas para este mes</h2><p>Recomendaciones basadas en tus registros.</p></div></div><div class="panel-body">' +
      (increase > 10 ? recommendation("ϟ", "Revisa el consumo de energía", "Subió " + increase + "% frente al promedio de los últimos meses. Revisa horarios de equipos y fugas de aire.", false) : recommendation("ϟ", "Registra tu energía", "Anota el consumo de la factura mensual para comparar los próximos períodos.", true)) +
      recommendation("↻", "Registra lo que aprovechas", "Anota los kg reutilizados o reciclados y guarda el soporte de entrega al gestor.", true) +
      recommendation("◌", "Compara el agua por unidad", "Revisa si el consumo sube cuando fabricas el mismo producto.", true) +
      '<div class="divider"></div><strong style="font-size:9px;color:#52645a">Datos del período</strong><div class="progress-line"><span style="width:' + (record.electricityKwh && record.waterM3 && totalWaste ? "80" : "45") + '%"></span></div><div class="progress-caption"><span>Consumos registrados</span><span>' + (record.electricityKwh && record.waterM3 && totalWaste ? "3 de 4 datos" : "2 de 4 datos") + '</span></div></div></div></div>';
  }

  function envMetric(label, value, foot, icon) {
    return '<div class="env-metric"><div class="env-metric-top"><span>' + label + '</span><span class="env-metric-icon">' + icon + '</span></div><strong>' + value + '</strong><small>' + foot + '</small></div>';
  }

  function recommendation(icon, title, detail, green) {
    return '<div class="recommendation"><span class="recommendation-icon' + (green ? " green" : "") + '">' + icon + '</span><div><strong>' + title + '</strong><p>' + detail + '</p></div></div>';
  }

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

  function estimateEmissions(record) {
    // Factor ilustrativo para demostración; reemplazar por factores UPME versionados antes del uso productivo.
    return (Number(record.electricityKwh) || 0) * 0.1 + (Number(record.fuelL) || 0) * 2.5;
  }

  function wasteTotal(record) {
    return (Number(record.organicKg) || 0) + (Number(record.recyclableKg) || 0) + (Number(record.nonRecyclableKg) || 0) + (Number(record.hazardousKg) || 0);
  }

  function openModal(title, description, content) {
    var root = document.getElementById("modal-root");
    root.innerHTML = '<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="modal-header"><div><h2>' + title + '</h2><p>' + description + '</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Cerrar">×</button></div>' + content + '</section></div>';
    root.querySelector(".modal-backdrop").addEventListener("click", function (event) {
      if (event.target.classList.contains("modal-backdrop")) closeModal();
    });
    var first = root.querySelector("input, select, button");
    if (first) first.focus();
  }

  function closeModal() {
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
    record.electricityKwh = Number(form.elements.energy.value) || 0;
    record.waterM3 = Number(form.elements.water.value) || 0;
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
    var purchase = { id: "co" + Date.now(), number: "OC-" + String(239 + state.purchases.length).padStart(4, "0"), supplier: supplier.name, date: today(), total: Number(form.elements.total.value) || 0, status: status, detail: product.name + " · " + num(quantity, 1) + " " + product.unit };
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
    else if (action === "new-purchase") openPurchaseModal();
    else if (action === "new-contact") openContactModal();
    else if (action === "new-adjustment") openAdjustmentModal();
    else if (action === "new-payment") openPaymentModal();
    else if (action === "setup") openSetupModal();
    else if (action === "production-complete") completeProduction(button.getAttribute("data-id"));
    else if (action === "close-modal") closeModal();
    else if (action.indexOf("-detail") >= 0) showDetails(action, button.getAttribute("data-id"));
    else if (action === "environment-export") exportEnvironment();
    else if (action === "inventory-export") exportCsv("pyme360-inventario.csv", [["SKU", "Producto", "Tipo", "Existencia", "Unidad", "Minimo", "Costo unitario"]].concat(state.inventory.map(function (item) { return [item.sku, item.name, item.type, item.stock, item.unit, item.min, item.cost]; })));
    else if (action === "finance-export") exportCsv("pyme360-movimientos.csv", [["Documento", "Fecha", "Contacto", "Total COP", "Estado"]].concat(state.sales.map(function (sale) { return [sale.number, sale.date, sale.customer, sale.total, sale.status]; })));
    else if (action === "help") openModal("Ayuda Pyme360", "Una guía breve para empezar.", '<div class="modal-form"><p><strong>1. Registra tus contactos.</strong> Así tendrás a mano clientes y proveedores.</p><p><strong>2. Ajusta tus existencias.</strong> Carga productos, materias primas e insumos.</p><p><strong>3. Usa los atajos.</strong> Registra ventas, producción y datos ambientales desde el menú.</p><p class="form-note">Esta versión guarda datos en el almacenamiento local de este navegador. No es una cuenta SaaS ni está conectada a servicios externos.</p><div class="modal-footer"><button class="button button-primary" data-action="close-modal">Entendido</button></div></div>');
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
    if (event.target.id === "sales-status") {
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
  render();
})();
