const URL_API = "https://rickandmortyapi.com/api";

const listaPersonajesRickandMorty = async (page = 1) => {
  const response = await fetch(`${URL_API}/character?page=${page}`);
  if (!response.ok) {
    throw new Error(`No se pudieron cargar los personajes: ${response.status}`);
  }

  const data = await response.json();
  return {
    personajes: data.results,
    totalPaginas: data.info.pages,
  };
};

let paginaActual = 1;
let totalPaginas = 1;

const baseTexto = (titulo, valor) => {
  const h2 = document.createElement("h2");
  const p = document.createElement("p");
  h2.textContent = titulo;
  p.textContent = valor;
  return { h2, p };
};

const informacionPersonaje = (title, value) => {
  const div = document.createElement("div");
  const titulos = baseTexto(title, value);
  div.appendChild(titulos.h2);
  div.appendChild(titulos.p);
  return div;
};

const construccionTarjetaPersonaje = (
  imagen,
  nombre,
  species,
  gender,
  type,
  status,
) => {
  const baseDiv = document.createElement("div");
  const containerImgDiv = document.createElement("div");
  const containerInfoDiv = document.createElement("div");
  const containerNameDiv = document.createElement("div");
  const containerStatsDiv = document.createElement("div");

  // definición contenedor padre
  baseDiv.className = "container-personaje";
  baseDiv.appendChild(containerImgDiv);
  baseDiv.appendChild(containerInfoDiv);

  // definición imagen
  const image = document.createElement("img");
  image.src = imagen;
  image.alt = `personaje-${nombre}-Rick-and-Morty`;
  containerImgDiv.appendChild(image);

  // definición información del personaje
  containerInfoDiv.className = "container-info-personaje";
  containerInfoDiv.appendChild(containerNameDiv);
  containerInfoDiv.appendChild(containerStatsDiv);

  const nodoNombre = baseTexto(nombre, `${species} - ${gender}`);
  containerNameDiv.className = "container-info-personaje-name";
  containerNameDiv.appendChild(nodoNombre.h2);
  containerNameDiv.appendChild(nodoNombre.p);

  const speciesNodo = informacionPersonaje("Especie:", species);
  const genderNodo = informacionPersonaje("Género:", gender);
  const tipoNodo = informacionPersonaje("Tipo:", type);
  const statusNodo = informacionPersonaje("Estado:", status);

  containerStatsDiv.className = "container-info-personaje-stats";
  containerStatsDiv.appendChild(speciesNodo);
  containerStatsDiv.appendChild(genderNodo);
  containerStatsDiv.appendChild(tipoNodo);
  containerStatsDiv.appendChild(statusNodo);

  return baseDiv;
};

const cargarPersonajes = async () => {
  const contenedor = document.querySelector("#personajes");
  const botonAnterior = document.querySelector("#pagina-anterior");
  const botonSiguiente = document.querySelector("#pagina-siguiente");
  const indicadorPagina = document.querySelector("#indicador-pagina");

  botonAnterior.disabled = true;
  botonSiguiente.disabled = true;
  indicadorPagina.textContent = "Cargando...";

  try {
    const resultado = await listaPersonajesRickandMorty(paginaActual);
    totalPaginas = resultado.totalPaginas;
    contenedor.replaceChildren();

    resultado.personajes.forEach((personaje) => {
      contenedor.appendChild(
        construccionTarjetaPersonaje(
          personaje.image,
          personaje.name,
          personaje.species,
          personaje.gender,
          personaje.type || "Sin tipo",
          personaje.status
        )
      );
    });

    indicadorPagina.textContent = `Página ${paginaActual} de ${totalPaginas}`;
    botonAnterior.disabled = paginaActual === 1;
    botonSiguiente.disabled = paginaActual === totalPaginas;
  } catch (error) {
    console.error(error);
    contenedor.replaceChildren();
    indicadorPagina.textContent = "No se pudieron cargar los personajes.";
    botonAnterior.disabled = paginaActual === 1;
    botonSiguiente.disabled = paginaActual === totalPaginas;
  }
};

document.querySelector("#pagina-anterior").addEventListener("click", () => {
  if (paginaActual > 1) {
    paginaActual -= 1;
    cargarPersonajes();
  }
});

document.querySelector("#pagina-siguiente").addEventListener("click", () => {
  if (paginaActual < totalPaginas) {
    paginaActual += 1;
    cargarPersonajes();
  }
});

cargarPersonajes();