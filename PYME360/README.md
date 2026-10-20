# Pyme360 — demostración de producto

Pyme360 es una demostración navegable de una plataforma de gestión sencilla para una pyme manufacturera colombiana. Está hecha con HTML, CSS y JavaScript. La librería de Excel está empaquetada localmente para leer y descargar libros sin enviarlos a un servidor. Al abrirla, la empresa, los contactos, los proveedores, los productos y las operaciones empiezan vacíos para que cada usuario registre sus propios datos.

## Abrir la demostración

Para usar todas las funciones, inicia el servidor local desde el lanzador correspondiente. Se abrirá Pyme360 en el navegador; deja abierta la ventana de terminal mientras lo uses. Cierra esa ventana para detener el servidor. El lanzador requiere Python 3.11 o superior y usa solo componentes incluidos con Python.

| Sistema | Cómo abrir |
|---|---|
| Windows | Haz doble clic en `Abrir Pyme360.bat`. |
| macOS | Marca los lanzadores como ejecutables una sola vez y haz doble clic en `Abrir Pyme360.command`. |
| Linux | Marca el lanzador como ejecutable una sola vez y ejecútalo desde una terminal. |

En Windows puedes usar `Instalar-Python-Pyme360.exe` para comprobar si Python ya está disponible e instalar Python 3.14 para tu usuario mediante `winget` si hace falta. El asistente no requiere permisos de administrador cuando Windows permite la instalación por usuario. Si `winget` no está disponible o falla, abrirá la página oficial para descargar Python. Después, ejecuta `Abrir Pyme360.bat`.

El ejecutable se puede regenerar desde el código fuente en `installer/windows/`, usando IExpress, una herramienta incluida con Windows. Si no tienes ese ejecutable o prefieres instalar Python manualmente, descárgalo desde [python.org](https://www.python.org/downloads/windows/). Activa “Add python.exe to PATH” en el instalador y luego ejecuta `Abrir Pyme360.bat`.

Para macOS y Linux, instala Python 3.11 o superior desde el gestor de paquetes o el instalador oficial. Después de descargar el proyecto, abre Terminal dentro de la carpeta y ejecuta:

```sh
chmod +x "Abrir Pyme360.command" Abrir-Pyme360.sh
```

Luego, en macOS, abre `Abrir Pyme360.command`; en Linux, ejecuta `./Abrir-Pyme360.sh`. El lanzador busca un puerto local disponible entre 8765 y 8790 y muestra la dirección que debes usar. Si no puede abrir el navegador automáticamente, copia esa dirección en uno.

No abras `web/index.html` directamente (`file://`) para trabajar: la base SQLite solo está disponible al iniciar con el lanzador. La selección del recibo se hace desde el navegador; el archivo se procesa localmente y no se conserva. El servidor consulta únicamente datos públicos de la serie ONU ODS 7.3.1; nunca envía los datos de la empresa.

Los datos de negocio se guardan en `pyme360.sqlite3`, en la carpeta de datos de tu usuario del sistema, fuera del repositorio. Permanecen después de cerrar el navegador y el servidor, pero no se sincronizan con otros computadores. Se crea una copia diaria local y se conservan hasta siete. Para cubrir la pérdida del computador, descarga además el respaldo JSON desde **Datos y Excel** y guárdalo en otro medio. Si esta versión encuentra datos anteriores en `pyme360.demo.v2` del mismo origen del navegador y la base está vacía, los migra una sola vez y conserva esa copia original. Si antes usabas `web/index.html` como `file://`, el navegador lo considera un origen separado: abre esa pestaña antigua, descarga **Datos y Excel → Respaldo y recuperación → Descargar respaldo**, inicia el lanzador nuevo y restaura ese archivo allí.

## Subir el proyecto a GitHub

1. Crea un repositorio nuevo en GitHub. Si vas a subir este `README.md`, deja desmarcada la opción para crear otro README.
2. Sube el contenido de esta carpeta con GitHub Desktop o Git. Conserva `web/vendor/receipt-reader`: contiene las librerías locales que necesita la lectura de recibos.
3. Antes de publicar, revisa los archivos que GitHub muestra para subir. Git y GitHub Desktop respetan `.gitignore`, que excluye `outputs/` y archivos de trabajo. Si cargas archivos desde la página web de GitHub, omite manualmente `outputs/`.
4. Usa GitHub Desktop o Git para cargar la carpeta completa y sus subcarpetas. La página web de GitHub sirve para subir archivos individuales, pero es menos práctica para este proyecto.

También puedes publicar el código desde una terminal, reemplazando la dirección por la URL de tu repositorio:

```sh
git init
git add .
git commit -m "Publica demostración Pyme360"
git branch -M main
git remote add origin https://github.com/USUARIO/REPOSITORIO.git
git push -u origin main
```

Si ya existe un remoto llamado `origin`, no repitas `git remote add origin`; revisa la configuración con `git remote -v` y usa la URL correcta.

Subir los archivos al repositorio permite que otras personas descarguen y ejecuten su propia copia. **No convierte la demo en una aplicación web compartida.** GitHub Pages solo publica los archivos estáticos: no ejecuta `server/serve-local.py`, así que SQLite y la consulta ONU no funcionarán desde Pages. Para que todos entren desde una URL con cuentas y datos sincronizados hace falta desplegar un servidor y una base de datos con autenticación.

No subas a GitHub datos reales de clientes, proveedores, facturas o usuarios. Esta versión no tiene inicio de sesión ni almacén central; quien la descarga conserva sus propios datos localmente en su computador.

## Flujos disponibles

- Guía de uso paso a paso en [docs/GUIA_DE_USO.md](docs/GUIA_DE_USO.md).

- Inicio con actividad y resumen operativo.
- Registro de ventas de varios productos, descuentos y pagos parciales; inventario y saldo por cobrar se ajustan automáticamente.
- Edición y eliminación de ventas con varios productos, ajuste de existencias e historial de pagos.
- Seguimiento manual de factura por venta: **Por revisar**, **Registrada por fuera de Pyme360** o **No aplica, según revisión del usuario**, con número y fecha externos opcionales. No determina obligaciones ni transmite documentos a la DIAN.
- Registro de compras con varios materiales, costos por renglón y actualización de existencias al recibir.
- Clientes de mostrador sin nombre ni datos personales; edición y eliminación de clientes y proveedores con confirmación.
- Recetas sencillas con varios materiales, cantidad por unidad y unidades visibles; órdenes de producción validan materiales, ingresan producto terminado y registran desperdicio.
- Captura mensual de energía, agua, combustibles, producción, residuos y material aprovechado.
- Lectura local de recibos PDF/JPG/PNG, con extracción de período y consumo para revisar antes de guardar; incluye modo de ejemplo y registro manual.
- Recomendaciones ambientales e indicadores por unidad producida comparados con el historial de la empresa; si falta historial, el sistema indica que está creando una referencia propia.
- Registro del origen del dato ambiental confirmado. El recibo original se descarta y no se conserva.
- Contactos, ajustes de inventario y exportación CSV de inventario y movimientos.
- Espacio **Datos y Excel** para descargar un libro maestro por hojas (incluye detalles de ventas/compras y pagos), obtener una plantilla vacía, importar `.xlsx`/`.xls` y crear o restaurar un respaldo completo local.
- Importaciones locales con validación de referencias y conservación de columnas adicionales; los cambios se aplican a SQLite después de confirmar.
- Configuración inicial de empresa y creación de productos, materias primas e insumos.
- Tema claro u oscuro, con preferencia guardada en el navegador.
- Inicio con una lista de pendientes: bajo inventario, compras por recibir, facturas con saldo, órdenes activas y consumos ambientales incompletos.

## Organización del proyecto

- `web/` contiene la interfaz, sus scripts y `vendor/` con las librerías locales de Excel y lectura de recibos.
- `server/` contiene el servidor Python local y su lanzador PowerShell.
- `docs/GUIA_DE_USO.md` contiene la guía paso a paso.
- `installer/windows/` contiene el código fuente del asistente de Python y el generador del ejecutable, que se conserva en la raíz.
- Los lanzadores de Windows, macOS y Linux permanecen en la raíz para que sea fácil abrir Pyme360.

El servidor sirve los archivos de `web/`, pero mantiene las mismas rutas de API local y los mismos datos SQLite externos al repositorio.

## Alcance de esta demostración

Esta versión usa una base SQLite local y un servidor accesible únicamente desde el mismo computador. No hay inicio de sesión, sincronización en red ni aislamiento de cuentas; por eso no debe compartirse un computador sin proteger la sesión del sistema operativo. El estado se guarda como una instantánea JSON versionada en una sola fila SQLite para mantener sencillo el prototipo. No integra DIAN, proveedor de facturación, RUA ni almacenamiento cloud. Las ventas solo tienen un seguimiento DIAN manual. La única consulta externa es la serie pública ONU ODS 7.3.1, a través de un endpoint local con caché de 24 horas. Las emisiones usan factores ilustrativos dentro del código; deben reemplazarse por factores oficiales versionados antes de utilizar el resultado fuera de una demostración.

La extracción de recibos es una ayuda que puede equivocarse y requiere confirmación humana. Los datos de la opción de ejemplo son ficticios. El indicador ODS 7.3.1 muestra datos públicos anuales de intensidad energética de la economía por PIB, para el mundo y Colombia cuando estén disponibles. Es contexto agregado, no un consumo objetivo por producto o empresa. La demo permite definir metas propias de reducción de energía y agua por unidad producida, calculadas a partir de tres períodos anteriores registrados; no son mínimos universales. La precisión del OCR aún debe medirse con recibos anonimizados de distintos proveedores.

La demo tampoco se conecta en tiempo real a empresas de energía o agua. Una integración futura dependerá de que el proveedor ofrezca una API para esa cuenta y de que el cliente autorice el acceso; no se asumirá cobertura universal ni lectura de agua.

La arquitectura de producción prevista queda descrita en la especificación: React/TypeScript, API Django, PostgreSQL, AWS y conexión de facturación mediante proveedor tecnológico autorizado.

## Datos locales y reinicio

La aplicación guarda el negocio en SQLite dentro de la carpeta de datos del usuario, fuera del repositorio. En Windows suele ser `%LOCALAPPDATA%\Pyme360\pyme360.sqlite3`; en macOS, `~/Library/Application Support/Pyme360/pyme360.sqlite3`; en Linux, `$XDG_DATA_HOME/pyme360/pyme360.sqlite3` o `~/.local/share/pyme360/pyme360.sqlite3`. La aplicación muestra **Guardando** y después **Guardado en este equipo** solo cuando SQLite confirma el cambio. Si otra pestaña ya guardó una revisión más nueva, pide recargar.

La importación Excel y la restauración del respaldo preparan el estado completo y lo guardan en una transacción. Si el servidor falla, el cambio no reemplaza la última versión guardada. En **Datos y Excel** puedes descargar un respaldo JSON y restaurarlo con vista previa. El servidor conserva hasta siete copias diarias junto a la base; esas copias están en el mismo computador. Para iniciar de cero, cierra Pyme360, haz una copia del archivo SQLite y elimina la base y los archivos auxiliares `-wal` y `-shm` de esa carpeta; al volver a abrir se crea una base vacía. Hazlo solo si ya exportaste los datos que quieras conservar.
