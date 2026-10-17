document.addEventListener("DOMContentLoaded", async () => {
  const version = "16.20.1";
  const championsUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/data/es_ES/champion.json`;
  const regionsUrl = new URL("./regions.json", document.baseURI);
  const positionsUrl = new URL("./positions.json", document.baseURI);
  const list = document.getElementById("champions");
  const status = document.getElementById("status");
  const search = document.getElementById("search");
  const regionFilter = document.getElementById("region-filter");
  const positionFilter = document.getElementById("position-filter");
  const clearPositions = document.getElementById("clear-positions");
  const resetFilters = document.getElementById("reset-filters");
  const activeFilters = document.getElementById("active-filters");
  const themeToggle = document.getElementById("theme-toggle");
  const metaThemeColor = document.getElementById("meta-theme-color");
  const emptyState = document.getElementById("empty-state");
  const loreDialog = document.getElementById("champion-lore-dialog");
  const loreTitle = document.getElementById("lore-title");
  const loreRegion = document.getElementById("lore-region");
  const loreStatus = document.getElementById("lore-status");
  const loreText = document.getElementById("lore-text");
  const loreClose = document.getElementById("lore-close");
  const loreRetry = document.getElementById("lore-retry");
  const THEME_STORAGE_KEY = "runeterra-theme";
  const loreCache = new Map();

  const getTheme = () =>
    document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";

  const updateThemeToggle = (theme) => {
    if (!themeToggle) return;
    const sunIcon = themeToggle.querySelector(".theme-icon-dark");
    const moonIcon = themeToggle.querySelector(".theme-icon-light");
    if (sunIcon) {
      if (theme === "light") sunIcon.setAttribute("hidden", "");
      else sunIcon.removeAttribute("hidden");
    }
    if (moonIcon) {
      if (theme === "light") moonIcon.removeAttribute("hidden");
      else moonIcon.setAttribute("hidden", "");
    }
    themeToggle.setAttribute("aria-pressed", String(theme === "light"));
    themeToggle.setAttribute(
      "aria-label",
      theme === "light" ? "Activar tema oscuro" : "Activar tema claro"
    );
  };

  const applyTheme = (theme) => {
    const nextTheme = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
      console.error("No se pudo guardar la preferencia de tema:", error);
    }
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", nextTheme === "light" ? "#e8ecf1" : "#080d16");
    }
    updateThemeToggle(nextTheme);
  };

  if (themeToggle) {
    updateThemeToggle(getTheme());
    themeToggle.addEventListener("click", () => {
      applyTheme(getTheme() === "light" ? "dark" : "light");
    });
  }
  const showLore = async (championId, championName, region) => {
    if (!loreDialog || !loreTitle || !loreRegion || !loreStatus || !loreText) return;

    loreDialog.dataset.championId = championId;
    loreDialog.dataset.championName = championName;
    loreDialog.dataset.championRegion = region;
    loreTitle.textContent = championName;
    loreRegion.textContent = region;
    loreStatus.textContent = "Cargando historia...";
    loreStatus.hidden = false;
    loreText.textContent = "";
    loreText.hidden = true;
    if (loreRetry) loreRetry.hidden = true;
    if (!loreDialog.open) loreDialog.showModal();

    try {
      let story = loreCache.get(championId);
      if (!story) {
        const response = await fetch(
          `https://ddragon.leagueoflegends.com/cdn/${version}/data/es_ES/champion/${encodeURIComponent(championId)}.json`
        );
        if (!response.ok) {
          throw new Error(`Data Dragon respondió con el estado ${response.status}`);
        }
        const data = await response.json();
        story = data.data?.[championId]?.lore;
        if (typeof story !== "string" || !story.trim()) {
          throw new Error(`No se encontró la historia de ${championName}`);
        }
        loreCache.set(championId, story);
      }

      if (loreDialog.dataset.championId !== championId) return;
      loreText.textContent = story;
      loreText.hidden = false;
      loreStatus.hidden = true;
    } catch (error) {
      console.error(`No se pudo cargar la historia de ${championName}:`, error);
      if (loreDialog.dataset.championId !== championId) return;
      loreStatus.textContent = "No se pudo cargar su historia. Comprueba tu conexión e inténtalo de nuevo.";
      if (loreRetry) loreRetry.hidden = false;
    }
  };

  loreClose?.addEventListener("click", () => loreDialog?.close());
  loreDialog?.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    loreDialog.close();
  });
  loreDialog?.addEventListener("close", () => {
    window.setTimeout(() => {
      const focusedCard = document.activeElement?.closest(".champion-card");
      focusedCard?.blur();
    }, 0);
  });
  loreRetry?.addEventListener("click", () => {
    const { championId, championName, championRegion } = loreDialog.dataset;
    if (championId && championName && championRegion) {
      showLore(championId, championName, championRegion);
    }
  });

  list.addEventListener("click", (event) => {
    const card = event.target.closest(".champion-card");
    if (card) {
      showLore(card.dataset.championId, card.dataset.championName, card.dataset.championRegion);
    }
  });

  list.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest(".champion-card");
    if (!card) return;
    event.preventDefault();
    showLore(card.dataset.championId, card.dataset.championName, card.dataset.championRegion);
  });

  const roleLabels = {
    Assassin: "Asesino",
    Fighter: "Luchador",
    Mage: "Mago",
    Marksman: "Tirador",
    Tank: "Tanque",
  };
  const positionLabels = {
    TOP: "Superior",
    JUNGLE: "Jungla",
    MIDDLE: "Central",
    BOTTOM: "Inferior",
    SUPPORT: "Soporte",
  };
  const canonicalPosition = (position) =>
    position === "UTILITY" ? "SUPPORT" : position;
  const normalize = (value) =>
    value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const normalizeChampionName = (value) =>
    normalize(value)
      .replace(/[^a-z0-9]/g, "")
      .replace(/^wukong$/, "monkeyking")
      .replace(/^nunu(?:and|y)?willump$/, "nunu");
  const regionPalette = {
    "bandle city": ["#7c3aed", "#29163d"],
    bilgewater: ["#0077b6", "#102d45"],
    demacia: ["#344fd1", "#17244a"],
    freljord: ["#00a6c7", "#103440"],
    ionia: ["#d81b60", "#39182d"],
    ixtal: ["#27883b", "#19351f"],
    noxus: ["#d62828", "#3b1c27"],
    piltover: ["#e76f00", "#3b2819"],
    "runeterra (sin region clara)": ["#526174", "#252d38"],
    "shadow isles": ["#795548", "#35251e"],
    shurima: ["#9a6700", "#382c18"],
    targon: ["#b5179e", "#391832"],
    "the void": ["#718c00", "#303813"],
    zaun: ["#008577", "#10332d"],
  };
  const buildRegionData = (data, champions) => {
    const sourceRegions = data.regions || data.regiones;
    if (!sourceRegions || typeof sourceRegions !== "object") {
      throw new Error("regions.json debe incluir un objeto 'regiones' o 'regions'");
    }

    const championIds = new Map();
    for (const champion of champions) {
      championIds.set(normalizeChampionName(champion.id), champion.id);
      championIds.set(normalizeChampionName(champion.name), champion.id);
    }

    const defaultTheme = data.defaultTheme || {
      accent: "#c8aa6e",
      glow: "rgba(200, 170, 110, 0.22)",
      surface: "#252117",
    };
    const regions = {};

    for (const [region, details] of Object.entries(sourceRegions)) {
      const [accent, surface] = regionPalette[normalize(region)] || ["#526174", "#252d38"];
      const theme = {
        accent: details.accent || accent,
        glow: details.glow || `color-mix(in srgb, ${details.accent || accent} 28%, transparent)`,
        surface: details.surface || surface,
      };
      const members = Array.isArray(details) ? details : details.champions;
      if (!Array.isArray(members)) {
        throw new Error(`La región "${region}" debe tener una lista de campeones`);
      }

      const regionChampions = members.map((member) => {
        if (typeof member === "string") return member;
        const name = member?.nombre || member?.name;
        const id = typeof name === "string" ? championIds.get(normalizeChampionName(name)) : null;
        if (!id) {
          console.warn(`No se pudo asociar el campeón "${name || "sin nombre"}" de ${region}`);
        }
        return id;
      }).filter(Boolean);

      regions[region] = { ...theme, champions: regionChampions };
    }

    return { ...data, defaultTheme, regions };
  };
  const debounce = (callback, delayMs) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => callback(...args), delayMs);
    };
  };
  const buildCatalog = (champions, regionsByChampion, positionsByChampion) =>
    champions.map((champion) => {
      const key = champion.id.toLowerCase();
      const rawPositions = positionsByChampion.get(key) || [];
      return {
        champion,
        key,
        normalizedName: normalize(champion.name),
        region: regionsByChampion.get(key) || "Runaterra",
        positions: [
          ...new Set(
            rawPositions.map(canonicalPosition).filter((position) => positionLabels[position])
          ),
        ],
        positionKeys: rawPositions.map(canonicalPosition),
      };
    });

  const setRegionTheme = (theme) => {
    const root = document.documentElement;
    root.style.setProperty("--active-region-accent", theme.accent);
    root.style.setProperty("--active-region-glow", theme.glow);
    root.style.setProperty("--active-region-surface", theme.surface);
  };

  const clearAllFilters = () => {
    search.value = "";
    regionFilter.value = "";
    for (const checkbox of positionFilter.querySelectorAll("input")) {
      checkbox.checked = false;
    }
  };

  const updateActiveFilterPills = (query, selectedRegion, selectedPositions, onRefresh) => {
    if (!activeFilters) return;
    activeFilters.replaceChildren();
    const pills = [];

    if (query) {
      pills.push({ kind: "search", label: `Buscar: ${search.value.trim()}`, value: query });
    }
    if (selectedRegion) {
      pills.push({ kind: "region", label: selectedRegion, value: selectedRegion });
    }
    for (const position of selectedPositions) {
      pills.push({
        kind: "position",
        label: positionLabels[position] || position,
        value: position,
      });
    }

    for (const pill of pills) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-pill";
      button.dataset.filterKind = pill.kind;
      if (pill.kind === "position") {
        button.dataset.filterValue = pill.value;
      }
      const labelSpan = document.createElement("span");
      labelSpan.textContent = pill.label;
      const removeIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      removeIcon.setAttribute("viewBox", "0 0 24 24");
      removeIcon.setAttribute("aria-hidden", "true");
      const removePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      removePath.setAttribute(
        "d",
        "M18.3 5.7a1 1 0 0 0-1.4-1.4L12 9.17 7.1 4.3a1 1 0 0 0-1.4 1.4L10.6 11 5.7 15.9a1 1 0 1 0 1.4 1.4L12 12.4l4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 11l4.9-4.9Z"
      );
      removePath.setAttribute("fill", "currentColor");
      removeIcon.appendChild(removePath);
      button.append(labelSpan, removeIcon);
      button.addEventListener("click", () => {
        if (pill.kind === "search") search.value = "";
        if (pill.kind === "region") regionFilter.value = "";
        if (pill.kind === "position") {
          const input = positionFilter.querySelector(`input[value="${pill.value}"]`);
          if (input) input.checked = false;
        }
        onRefresh();
      });
      activeFilters.appendChild(button);
    }

    activeFilters.hidden = pills.length === 0;
  };

  const renderChampions = (catalog, regionData, totalCount) => {
    const query = normalize(search.value);
    const selectedRegion = regionFilter.value;
    const selectedPositions = new Set(
      [...positionFilter.querySelectorAll("input:checked")].map((input) => input.value)
    );
    const regionTheme = selectedRegion
      ? regionData.regions[selectedRegion]
      : regionData.defaultTheme;
    setRegionTheme(regionTheme);
    document.body.classList.toggle("region-active", Boolean(selectedRegion));
    list.classList.add("is-updating");

    const filteredChampions = catalog.filter(
      ({ normalizedName, region, positionKeys }) =>
        normalizedName.includes(query) &&
        (!selectedRegion || region === selectedRegion) &&
        (selectedPositions.size === 0 ||
          positionKeys.some((position) => selectedPositions.has(position)))
    );
    const fragment = document.createDocumentFragment();

    for (const [index, entry] of filteredChampions.entries()) {
      const { champion, region, positions } = entry;
      const championTheme = regionData.regions[region] || regionData.defaultTheme;
      const card = document.createElement("li");
      card.className = "champion-card";
      card.tabIndex = 0;
      card.dataset.championId = champion.id;
      card.dataset.championName = champion.name;
      card.dataset.championRegion = region;
      card.setAttribute("aria-haspopup", "dialog");
      card.setAttribute("aria-label", `Ver la historia de ${champion.name}`);
      card.style.setProperty("--card-order", Math.min(index, 12));
      card.style.setProperty("--champion-accent", championTheme.accent);
      card.style.setProperty("--champion-glow", championTheme.glow);
      card.style.setProperty("--champion-surface", championTheme.surface);

      const imageFrame = document.createElement("div");
      imageFrame.className = "champion-image-frame";

      const regionBadge = document.createElement("span");
      regionBadge.className = "champion-region-badge";
      regionBadge.textContent = region;

      const image = document.createElement("img");
      image.src = `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion.id}.png`;
      image.alt = `Retrato de ${champion.name}`;
      image.loading = "lazy";

      imageFrame.append(regionBadge, image);

      const info = document.createElement("div");
      info.className = "champion-info";

      const name = document.createElement("h3");
      name.className = "champion-name";
      name.textContent = champion.name;

      const roles = document.createElement("ul");
      roles.className = "champion-roles";
      roles.setAttribute("aria-label", `Roles de combate de ${champion.name}`);

      for (const role of champion.tags.filter((tag) => tag !== "Support")) {
        const roleItem = document.createElement("li");
        roleItem.textContent = roleLabels[role] || role;
        roles.appendChild(roleItem);
      }

      const details = [name];
      if (roles.childElementCount > 0) {
        const rolesSection = document.createElement("section");
        rolesSection.className = "champion-detail";
        const rolesHeading = document.createElement("h4");
        rolesHeading.textContent = "Arquetipo";
        rolesSection.append(rolesHeading, roles);
        details.push(rolesSection);
      }

      const positionSection = document.createElement("section");
      positionSection.className = "champion-detail";
      const positionHeading = document.createElement("h4");
      positionHeading.textContent = "Posición en la Grieta";
      positionSection.appendChild(positionHeading);

      if (positions.length > 0) {
        const positionList = document.createElement("ul");
        positionList.className = "champion-positions";
        positionList.setAttribute("aria-label", `Líneas de ${champion.name}`);

        for (const position of positions) {
          const positionItem = document.createElement("li");
          const positionLabel = document.createElement("span");
          positionLabel.textContent = positionLabels[position];
          positionItem.appendChild(positionLabel);
          positionList.appendChild(positionItem);
        }

        positionSection.appendChild(positionList);
      } else {
        const unavailable = document.createElement("p");
        unavailable.className = "positions-unavailable";
        unavailable.textContent = "Esta API no indica una línea";
        positionSection.appendChild(unavailable);
      }

      details.push(positionSection);
      info.append(...details);
      card.append(imageFrame, info);
      fragment.appendChild(card);
    }

    list.replaceChildren(fragment);
    list.classList.remove("is-updating");
    emptyState.hidden = filteredChampions.length > 0;
    status.textContent = query || selectedRegion || selectedPositions.size > 0
      ? `${filteredChampions.length} de ${totalCount} campeones`
      : `${totalCount} campeones`;
  };

  try {
    const [championsResponse, regionsResponse, positionsResponse] = await Promise.all([
      fetch(championsUrl),
      fetch(regionsUrl),
      fetch(positionsUrl),
    ]);

    if (!championsResponse.ok) {
      throw new Error(`Data Dragon respondió con el estado ${championsResponse.status}`);
    }
    if (!regionsResponse.ok) {
      throw new Error(`No se pudo cargar regions.json (${regionsResponse.status})`);
    }
    if (!positionsResponse.ok) {
      throw new Error(`No se pudo cargar positions.json (${positionsResponse.status})`);
    }

    const [championData, rawRegionData, positionsData] = await Promise.all([
      championsResponse.json(),
      regionsResponse.json(),
      positionsResponse.json(),
    ]);
    const champions = Object.values(championData.data);
    const regionData = buildRegionData(rawRegionData, champions);
    const regionsByChampion = new Map();
    const positionsByChampion = new Map();

    for (const [region, details] of Object.entries(regionData.regions)) {
      for (const championId of details.champions) {
        const normalizedId = championId.toLowerCase();
        if (!regionsByChampion.has(normalizedId)) {
          regionsByChampion.set(normalizedId, region);
        }
      }
    }

    const regions = Object.keys(regionData.regions).sort((first, second) =>
      first.localeCompare(second, "es")
    );

    for (const region of regions) {
      const option = document.createElement("option");
      option.value = region;
      option.textContent = region;
      regionFilter.appendChild(option);
    }

    for (const [championKey, positions] of Object.entries(positionsData.champions)) {
      if (Array.isArray(positions)) {
        positionsByChampion.set(championKey.toLowerCase(), positions);
      }
    }

    const catalog = buildCatalog(champions, regionsByChampion, positionsByChampion);
    const refreshCatalog = () => {
      const query = normalize(search.value);
      const selectedRegion = regionFilter.value;
      const selectedPositions = new Set(
        [...positionFilter.querySelectorAll("input:checked")].map((input) => input.value)
      );
      updateActiveFilterPills(query, selectedRegion, selectedPositions, refreshCatalog);
      renderChampions(catalog, regionData, champions.length);
    };

    search.addEventListener("input", debounce(refreshCatalog, 120));
    regionFilter.addEventListener("change", refreshCatalog);
    positionFilter.addEventListener("change", refreshCatalog);
    clearPositions.addEventListener("click", () => {
      for (const checkbox of positionFilter.querySelectorAll("input")) {
        checkbox.checked = false;
      }
      refreshCatalog();
    });
    resetFilters?.addEventListener("click", () => {
      clearAllFilters();
      refreshCatalog();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && document.activeElement !== search) {
        event.preventDefault();
        search.focus();
      }
      if (event.key === "Escape" && (search.value || regionFilter.value || positionFilter.querySelector("input:checked"))) {
        clearAllFilters();
        refreshCatalog();
      }
    });
    refreshCatalog();
  } catch (error) {
    console.error("Error al cargar el catálogo:", error);
    status.textContent = "No se pudo cargar el catálogo. Abre esta página con un servidor local (por ejemplo, Live Server) e inténtalo de nuevo.";
  }
});
