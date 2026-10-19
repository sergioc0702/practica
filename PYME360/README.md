# Pyme360 — demostración de producto

Pyme360 es una demostración navegable de una plataforma de gestión sencilla para una pyme manufacturera colombiana. Está hecha con HTML, CSS y JavaScript. La librería de Excel está empaquetada localmente para leer y descargar libros sin enviarlos a un servidor. Al abrirla, la empresa, los contactos, los proveedores, los productos y las operaciones empiezan vacíos para que cada usuario registre sus propios datos.

## Abrir la demostración

Para usar todas las funciones, inicia el servidor local desde el lanzador correspondiente. Se abrirá Pyme360 en el navegador; deja abierta la ventana de terminal mientras lo uses. Cierra esa ventana para detener el servidor.

| Sistema | Cómo abrir |
|---|---|
| Windows | Haz doble clic en `Abrir Pyme360.bat`. |
| macOS | Instala PowerShell 7, marca los lanzadores como ejecutables una sola vez y haz doble clic en `Abrir Pyme360.command`. |
| Linux | Instala PowerShell 7, marca el lanzador como ejecutable una sola vez y ejecútalo desde una terminal. |

PowerShell 7 (`pwsh`) es un requisito en macOS y Linux. Las instrucciones oficiales de instalación están en [Microsoft Learn](https://learn.microsoft.com/powershell/scripting/install/install-powershell). Después de descargar el proyecto, abre Terminal dentro de la carpeta y ejecuta:

```sh
chmod +x "Abrir Pyme360.command" Abrir-Pyme360.sh
```

Luego, en macOS, abre `Abrir Pyme360.command`; en Linux, ejecuta `./Abrir-Pyme360.sh`. El lanzador busca un puerto local disponible entre 8765 y 8790 y muestra la dirección que debes usar. Si no puede abrir el navegador automáticamente, copia esa dirección en uno.

No abras `index.html` directamente (`file://`) si necesitas consultar la referencia ONU u OCR de recibos. La selección del recibo se hace desde el navegador; el archivo se procesa localmente y no se conserva. El servidor consulta únicamente datos públicos de la serie ONU ODS 7.3.1; nunca envía los datos de la empresa.

Los datos de la demostración se guardan en el almacenamiento local del navegador y del computador donde se registran. No se sincronizan con GitHub ni con otros equipos. El modo `file://` y la dirección del servidor local también mantienen almacenes separados; si necesitas pasar datos entre ambos, descarga **Datos y Excel → Excel maestro** e impórtalo en el otro modo.

## Subir el proyecto a GitHub

1. Crea un repositorio nuevo en GitHub. Si vas a subir este `README.md`, deja desmarcada la opción para crear otro README.
2. Sube el contenido de esta carpeta con GitHub Desktop o Git. Conserva la carpeta `vendor/receipt-reader`: contiene las librerías locales que necesita la lectura de recibos.
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

Subir los archivos al repositorio permite que otras personas descarguen y ejecuten su propia copia. **No convierte la demo en una aplicación web compartida.** GitHub Pages solo publica los archivos estáticos: no ejecuta `serve-local.ps1`, así que la consulta ONU no funcionará desde Pages. Para que todos entren desde una URL con cuentas y datos sincronizados hace falta desplegar un servidor y una base de datos con autenticación.

No subas a GitHub datos reales de clientes, proveedores, facturas o usuarios. Esta demo no tiene inicio de sesión ni almacén central; quien la descarga conserva sus propios datos localmente en su navegador.

## Flujos disponibles

- Guía de uso paso a paso en [GUIA_DE_USO.md](GUIA_DE_USO.md).

- Inicio con actividad y resumen operativo.
- Registro de ventas, descuentos y pagos; el inventario se descuenta automáticamente.
- Registro de compras recibidas y actualización de existencias.
- Órdenes de producción con receta, validación de materiales, entrada de producto terminado y registro de desperdicio.
- Captura mensual de energía, agua, combustibles, producción, residuos y material aprovechado.
- Lectura local de recibos PDF/JPG/PNG, con extracción de período y consumo para revisar antes de guardar; incluye modo de ejemplo y registro manual.
- Recomendaciones ambientales e indicadores por unidad producida comparados con el historial de la empresa; si falta historial, el sistema indica que está creando una referencia propia.
- Registro del origen del dato ambiental confirmado. El recibo original se descarta y no se conserva.
- Contactos, ajustes de inventario y exportación CSV de inventario y movimientos.
- Espacio **Datos y Excel** para descargar un libro maestro por hojas, obtener una plantilla vacía e importar archivos `.xlsx` o `.xls` con asignación de columnas, revisión de duplicados y vista previa.
- Importaciones locales con validación de referencias, conservación de columnas adicionales y guardado después de confirmar y comprobar el espacio del navegador.
- Configuración inicial de empresa y creación de productos, materias primas e insumos.
- Tema claro u oscuro, con preferencia guardada en el navegador.

## Organización del código

- `index.html` define la estructura y carga los scripts locales en orden: Excel, lectura de recibos, lógica principal e inicializador.
- `styles.css` contiene los componentes de interfaz, los temas y los ajustes para pantallas pequeñas.
- `app-core.js` coordina el estado local, la navegación, las vistas, la importación Excel y las operaciones de la demo.
- `excel-workbook.js` se encarga de leer, preparar y descargar libros de Excel.
- `receipt-reader.js` procesa recibos PDF e imágenes localmente y entrega campos para revisión.
- `app.js` inicia la aplicación cuando el documento está listo.

Los scripts de la aplicación se mantienen en la raíz porque los lanzadores y las rutas de recursos locales dependen de esa estructura.

## Alcance de esta demostración

Esta versión es una interfaz funcional de demostración, no una plataforma SaaS conectada. Guarda datos de la empresa solamente en el navegador actual; no hay inicio de sesión ni aislamiento real por cuenta. Por eso, el espacio vacío es independiente por navegador y dispositivo, pero no representa todavía cuentas de usuario separadas en un servidor. No integra DIAN, proveedor de facturación, RUA ni almacenamiento cloud. La única consulta externa es la serie pública ONU ODS 7.3.1, a través de un endpoint del servidor local y con caché de 24 horas. Las emisiones usan factores ilustrativos dentro del código; deben reemplazarse por factores oficiales versionados antes de utilizar el resultado fuera de una demostración.

La extracción de recibos es una ayuda que puede equivocarse y requiere confirmación humana. Los datos de la opción de ejemplo son ficticios. El indicador ODS 7.3.1 muestra datos públicos anuales de intensidad energética de la economía por PIB, para el mundo y Colombia cuando estén disponibles. Es contexto agregado, no un consumo objetivo por producto o empresa. La demo permite definir metas propias de reducción de energía y agua por unidad producida, calculadas a partir de tres períodos anteriores registrados; no son mínimos universales. La precisión del OCR aún debe medirse con recibos anonimizados de distintos proveedores.

La demo tampoco se conecta en tiempo real a empresas de energía o agua. Una integración futura dependerá de que el proveedor ofrezca una API para esa cuenta y de que el cliente autorice el acceso; no se asumirá cobertura universal ni lectura de agua.

La arquitectura de producción prevista queda descrita en la especificación: React/TypeScript, API Django, PostgreSQL, AWS y conexión de facturación mediante proveedor tecnológico autorizado.

## Datos locales y reinicio

La versión actual guarda información bajo la clave `pyme360.demo.v2` del almacenamiento local del navegador. La importación Excel prepara todos los cambios antes de guardarlos; si el archivo es inválido, se cancela o no hay espacio, los datos existentes permanecen intactos. Para empezar de nuevo en ese navegador, elimina esa clave desde las herramientas de desarrollo y recarga la página. La clave anterior `pyme360.demo.v1`, que puede contener datos de muestra de una versión previa, se conserva y no se copia a la versión actual.
