const roleColors = {
  Duelist: '#ff4655',
  Sentinel: '#83d39a',
  Initiator: '#79c8e8',
  Controller: '#b79aff'
};

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

async function fetchData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`La API respondió con el estado ${response.status}.`);
  }

  const result = await response.json();
  if (!Array.isArray(result.data)) {
    throw new Error('La respuesta de la API no contiene una lista válida.');
  }
  return result.data;
}

function showError(container, error) {
  console.error(error);
  container.innerHTML = '<p class="empty-state">No se pudo cargar el contenido. Comprueba tu conexión e inténtalo de nuevo.</p>';
}

const contentTabs = document.querySelector('.content-tabs');
const contentPanels = document.querySelectorAll('.content-panel');
const metrics = document.querySelector('.metrics');
const containers = {
  agents: document.getElementById('agents'),
  maps: document.getElementById('maps'),
  weapons: document.getElementById('weapons')
};
const dataCache = {};
let activeContent = null;
let selectionId = 0;

async function getContentData(content) {
  if (!dataCache[content]) {
    const url = content === 'agents'
      ? 'https://valorant-api.com/v1/agents?isPlayableCharacter=true'
      : content === 'maps'
        ? 'https://valorant-api.com/v1/maps'
        : 'https://valorant-api.com/v1/weapons';
    dataCache[content] = fetchData(url).catch((error) => {
      delete dataCache[content];
      throw error;
    });
  }

  return dataCache[content];
}

function renderAgents(agents) {
  const playableAgents = agents.filter((agent) => agent.isPlayableCharacter && agent.fullPortrait);
  const roles = new Set(playableAgents.map((agent) => agent.role?.displayName).filter(Boolean));
  document.getElementById('metric-total').textContent = playableAgents.length;
  document.getElementById('metric-roles').textContent = roles.size;

  return playableAgents.map((agent) => {
    const role = agent.role?.displayName || 'Agente';
    const roleColor = roleColors[role] || '#c5c5c5';
    const abilities = (agent.abilities || [])
      .filter((ability) => ability.displayName)
      .slice(0, 3)
      .map((ability) => `<span class="ability-pill">${escapeHTML(ability.displayName)}</span>`)
      .join('');

    return `
      <article class="agent-card">
        <div class="card-top">
          <span class="role-badge" style="--role-color: ${roleColor}">${escapeHTML(role)}</span>
        </div>
        <div class="agent-portrait">
          <img src="${escapeHTML(agent.fullPortrait)}" alt="${escapeHTML(agent.displayName)}" loading="lazy" />
        </div>
        <div class="agent-body">
          <div class="title-row">
            <h2>${escapeHTML(agent.displayName)}</h2>
          </div>
          <p>${escapeHTML(agent.description || 'Sin descripción disponible.')}</p>
          <div class="ability-list">${abilities}</div>
        </div>
      </article>
    `;
  }).join('');
}

function renderMaps(maps) {
  const displayedCoordinates = new Set();
  return maps
    .filter((map) => {
      if (typeof map.coordinates !== 'string' || !map.coordinates.trim()) return false;
      const coordinateKey = map.coordinates.trim().replace(/\s+/g, ' ').toLowerCase();
      if (displayedCoordinates.has(coordinateKey)) return false;
      displayedCoordinates.add(coordinateKey);
      return true;
    })
    .map((map) => {
    const image = map.splash
      ? `<div class="agent-portrait"><img src="${escapeHTML(map.splash)}" alt="Vista del mapa ${escapeHTML(map.displayName)}" loading="lazy" /></div>`
      : '<div class="agent-portrait"><p class="empty-state">Imagen no disponible</p></div>';

    return `
      <article class="agent-card map-card">
        ${image}
        <div class="agent-body">
          <div class="title-row">
            <h2>${escapeHTML(map.displayName || 'Mapa sin nombre')}</h2>
          </div>
          <p>${escapeHTML(map.coordinates)}</p>
        </div>
      </article>
    `;
    }).join('');
}

function renderWeapons(weapons) {
  return weapons.map((weapon) => {
    const stats = weapon.weaponStats;
    const shop = weapon.shopData;
    const category = weapon.category?.split('::').pop() || 'Arma';
    const damage = stats?.damageRanges?.[0];
    const image = weapon.displayIcon
      ? `<img src="${escapeHTML(weapon.displayIcon)}" alt="${escapeHTML(weapon.displayName || 'Arma')}" loading="lazy" />`
      : '<p class="empty-state">Imagen no disponible</p>';
    const damageDetails = damage
      ? `<div class="weapon-damage">
          <span><strong>${escapeHTML(damage.headDamage)}</strong> Cabeza</span>
          <span><strong>${escapeHTML(damage.bodyDamage)}</strong> Cuerpo</span>
          <span><strong>${escapeHTML(damage.legDamage)}</strong> Piernas</span>
        </div>`
      : '';

    return `
      <article class="agent-card weapon-card">
        <div class="weapon-image">${image}</div>
        <div class="agent-body">
          <div class="title-row">
            <h2>${escapeHTML(weapon.displayName || 'Arma sin nombre')}</h2>
            <span class="role-badge weapon-category">${escapeHTML(category)}</span>
          </div>
          <div class="weapon-stats">
            <span><small>Precio</small><strong>${Number.isFinite(shop?.cost) ? `${shop.cost} cr` : 'Gratis'}</strong></span>
            <span><small>Cargador</small><strong>${Number.isFinite(stats?.magazineSize) ? stats.magazineSize : '—'}</strong></span>
            <span><small>Cadencia</small><strong>${Number.isFinite(stats?.fireRate) ? stats.fireRate : '—'}</strong></span>
          </div>
          ${damageDetails}
        </div>
      </article>
    `;
  }).join('');
}

async function selectContent(content) {
  if (!containers[content] || activeContent === content) return;
  activeContent = content;
  const currentSelectionId = ++selectionId;

  document.querySelectorAll('.content-tab').forEach((tab) => {
    const isSelected = tab.dataset.content === content;
    tab.classList.toggle('is-active', isSelected);
    tab.setAttribute('aria-selected', String(isSelected));
  });

  contentPanels.forEach((panel) => {
    const isSelected = panel.id === `${content}-panel`;
    panel.hidden = !isSelected;
    panel.style.display = isSelected ? '' : 'none';
  });
  metrics.hidden = content !== 'agents';

  Object.entries(containers).forEach(([key, container]) => {
    container.replaceChildren();
    if (key === content) {
      container.innerHTML = '<p class="empty-state">Cargando contenido...</p>';
    }
  });

  try {
    const data = await getContentData(content);
    if (currentSelectionId !== selectionId) return;
    containers[content].innerHTML = content === 'agents'
      ? renderAgents(data)
      : content === 'maps'
        ? renderMaps(data)
        : renderWeapons(data);
  } catch (error) {
    if (currentSelectionId === selectionId) showError(containers[content], error);
  }
}

contentTabs.addEventListener('click', (event) => {
  const tab = event.target.closest('.content-tab');
  if (tab && contentTabs.contains(tab)) selectContent(tab.dataset.content);
});

selectContent('agents');
