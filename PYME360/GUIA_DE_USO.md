# Guía de uso de Pyme360

Esta guía corresponde a la demostración actual de Pyme360. Está escrita para empezar desde cero, sin conocimientos contables ni técnicos.

> **Antes de empezar:** esta versión guarda la información en el navegador de este dispositivo. No tiene inicio de sesión ni separa empresas en un servidor. Úsala con datos de prueba; todavía no transmite facturas a la DIAN ni reemplaza el sistema contable de la empresa.

## 1. Recorrido recomendado para empezar

Completa estos pasos en orden. Puedes dejar datos para después y volver cuando quieras.

1. **Configura la empresa.** Pulsa el nombre de empresa en la parte superior del menú y escribe el nombre, NIT, ciudad y actividad. El NIT y la ciudad se pueden completar más tarde.
2. **Registra tus contactos.** Abre **Contactos → Nuevo contacto**. Elige si es cliente, proveedor o ambos. Cada contacto que agregues aparecerá en las listas de tu demostración.
3. **Crea el inventario.** En **Inventario → Agregar producto**, registra primero materias primas e insumos, y luego los productos que vendes o fabricas.
4. **Prepara una receta.** Al crear un producto terminado, puedes indicar una materia prima o insumo y la cantidad que se usa por unidad. La demostración admite un material por producto.
5. **Empieza a registrar operaciones.** Usa **Ventas**, **Compras** o **Producción**. Revisa las existencias después de cada movimiento.
6. **Registra el consumo ambiental.** Abre **Impacto ambiental → Registrar datos** y sube una factura o usa el ejemplo. Revisa los valores antes de confirmarlos.

### Cambiar el tema de pantalla

Pulsa el botón de luna o sol en la barra superior para alternar entre tema claro y oscuro. La preferencia se guarda en este navegador y no cambia los datos de la empresa.

## 2. Configurar la empresa

1. Pulsa el botón con el nombre de la empresa en la barra lateral.
2. Escribe el nombre o razón social. Puedes añadir NIT, ciudad y actividad.
3. Pulsa **Guardar y continuar**.

La configuración identifica la empresa en la pantalla. En esta demostración no crea una cuenta ni configura varias sedes o bodegas.

## 3. Registrar un cliente o proveedor

1. Abre **Contactos**.
2. Pulsa **Nuevo contacto**.
3. Escribe el nombre o razón social.
4. En **Tipo de contacto**, elige **Cliente**, **Proveedor** o **Cliente y proveedor**.
5. Añade NIT o cédula, correo y teléfono si los tienes.
6. Pulsa **Guardar contacto**.

El nombre y tipo son los datos necesarios para empezar. Los contactos se podrán elegir al registrar ventas o compras.

## 4. Crear productos, materiales e inventario

1. Abre **Inventario** y pulsa **Agregar producto**.
2. Escribe un nombre fácil de reconocer.
3. Elige el tipo:
   - **Materia prima:** material que se transforma o incorpora al producto.
   - **Insumo:** material auxiliar, como empaques.
   - **Producto terminado:** artículo que vendes o fabricas.
4. Selecciona la unidad y registra la existencia inicial, el mínimo que quieres vigilar y el costo.
5. Para un producto terminado, añade precio de venta, clasificación de IVA y, si corresponde, un material y la cantidad usada por unidad.
6. Pulsa **Guardar producto**.

La demostración genera un código de referencia automáticamente. La tarifa de IVA es un dato configurable para esta demostración; confirma su aplicación con tu contador.

**Orden sugerido:** registra primero la existencia de materias primas e insumos. Después crea el producto terminado y asígnale uno de esos materiales. De esta forma, la orden de producción podrá revisar y descontar materiales.

### Ajustar una existencia

En **Inventario**, pulsa **Ajustar stock**, escribe el cambio —por ejemplo, `5` para sumar cinco o `-2` para restar dos— y selecciona un motivo. No puedes dejar una existencia negativa.

## 5. Registrar una venta

Antes de empezar, agrega un cliente y al menos un producto terminado con precio y existencia disponible.

1. Abre **Ventas** y pulsa **Registrar venta**.
2. Elige cliente, fecha, producto, cantidad y forma de pago.
3. Si aplica, escribe un descuento en pesos.
4. Revisa el total aproximado y pulsa **Guardar venta**.
5. Consulta el estado en la lista de ventas. Si fue a crédito, aparecerá como pendiente de pago.

La demostración descuenta las unidades vendidas del inventario. El total estima el IVA con la configuración del producto. Cada venta de esta versión incluye un solo producto.

> **Factura electrónica:** guardar una venta aquí no la emite ni la transmite a la DIAN. El proveedor tecnológico todavía no está conectado.

## 6. Registrar una compra

Antes de empezar, agrega un proveedor y una materia prima o insumo.

1. Abre **Compras** y pulsa **Registrar compra**.
2. Elige el proveedor y el producto recibido.
3. Escribe la cantidad y el valor total en COP.
4. Selecciona **Recibida** si ya llegó o **Por recibir** si está pendiente.
5. Pulsa **Guardar compra**.

Si eliges **Recibida**, la cantidad se suma al inventario. Si eliges **Por recibir**, el registro queda pendiente y las existencias no cambian.

## 7. Registrar producción

Antes de empezar, crea un producto terminado y asígnale una materia prima o insumo en la receta. Asegúrate de tener material disponible.

1. Abre **Producción** y pulsa **Nueva orden**.
2. Elige el producto terminado e indica cuántas unidades vas a fabricar.
3. Anota el desperdicio aproximado en kg. Si aún no lo sabes, déjalo en cero.
4. Revisa el material que la receta calcula y pulsa **Crear orden**.
5. Cuando termines de fabricar, pulsa **Terminar** en la orden o abre su detalle y elige **Marcar como terminada**.

Al crear la orden, el sistema descuenta el material estimado. Al terminarla, suma el producto terminado al inventario y registra las unidades producidas y el desperdicio. Si falta material, corrige la existencia o ajusta la cantidad de la orden.

## 8. Registrar el impacto ambiental del mes

Puedes cargar un recibo para que Pyme360 encuentre el período y el consumo, o seguir usando la captura manual.

### Leer un recibo

1. En **Impacto ambiental**, pulsa **Registrar datos → Subir un recibo**. El navegador abrirá el explorador de archivos para elegir un archivo local; no necesitas escribir su ruta. Si abriste `index.html` directamente y el lector automático no puede iniciarse, usa el lanzador de tu sistema para habilitar el OCR y vuelve a elegir el recibo. En ambos casos Pyme360 permanece en el navegador.
2. Elige un PDF, JPG o PNG de hasta 15 MB. En PDF se admiten hasta 8 páginas; para mejores resultados, carga la página donde aparece el consumo.
3. Pyme360 extrae el texto en este computador. Si el PDF es un escaneo o subes una foto, intenta reconocer los caracteres en español.
4. Revisa el tipo de servicio, el mes y el consumo. Corrige cualquier campo dudoso; si no se encontró, escríbelo tú.
5. Pulsa **Confirmar y guardar** solo cuando coincida con la factura. Si cierras o cancelas, no se crea un registro.

El recibo original se procesa en memoria y se descarta; Pyme360 conserva el consumo confirmado, su período y el origen del dato. No se sube a un servidor. Al abrir `index.html` con `file://`, el selector local funciona; el OCR puede estar limitado por el navegador. Si no puede leer el archivo, no se guarda ningún dato y puedes ingresarlo manualmente o volver a cargarlo desde el acceso local.

### Probar el ejemplo o registrar manualmente

1. Abre **Impacto ambiental → Registrar datos**.
2. Elige **Probar con un ejemplo** para ver un consumo ficticio de demostración. Confirma o cancela; la pantalla lo identifica como ejemplo.
3. También puedes elegir **Ingresar datos manualmente** y anotar energía en kWh, agua en m³, combustible en litros, unidades producidas y residuos en kg.
4. Revisa el resumen, los consumos por unidad producida y las ideas del mes. Para descargar la información, pulsa **Descargar resumen**.

Pyme360 compara kWh/unidad y m³/unidad con los meses anteriores de tu empresa si hay al menos dos meses con consumo y producción registrados. Si no los hay, muestra **Sin referencia suficiente** mientras construye una referencia propia; no etiqueta un consumo como correcto o incorrecto.

### Consultar el contexto ONU y definir tus metas

1. Abre **Impacto ambiental** usando el lanzador de tu sistema para habilitar la consulta. El servidor local pide a la API pública de la ONU únicamente la serie ODS 7.3.1; no envía datos de la empresa.
2. Revisa por separado los datos anuales agregados de **Mundo** y **Colombia**, el año más reciente disponible, la unidad y la fuente. Pulsa **Actualizar** para volver a consultar. Si no hay conexión, la pantalla muestra la última respuesta guardada y su fecha; si no hay una copia, puedes reintentar.
3. Para crear objetivos de la empresa, pulsa **Definir metas** y elige un porcentaje de mejora independiente para energía y agua. Pyme360 calcula cada meta como ese porcentaje menos que el promedio de los últimos tres meses anteriores registrados con consumo y producción.

El ODS 7.3.1 mide energía primaria suministrada por unidad de PIB. Es un indicador anual de la economía, no una lectura de tu fábrica y no se compara directamente con kWh por unidad producida. Las metas son objetivos propios de mejora, no límites universales ni requisitos ambientales. Abrir `index.html` directamente (`file://`) mantiene el registro local, pero no consulta la referencia ONU; usa el acceso local `.bat` para esa consulta.

El selector de período permite consultar los meses guardados. El resumen calcula emisiones con un factor ilustrativo incluido en la demostración; **no es una medición certificada ni un reporte oficial**. Antes de usar emisiones para decisiones formales, deben configurarse factores vigentes y documentar su fuente con un asesor.

## 9. Registrar un pago y revisar finanzas

1. Abre **Finanzas** y pulsa **Registrar pago**.
2. Elige una venta pendiente, indica fecha y medio de pago.
3. Pulsa **Confirmar pago**.

La venta queda marcada como pagada. En **Finanzas** puedes revisar ingresos registrados, valores por cobrar y movimientos de ventas. Este resumen es administrativo; no reemplaza libros contables ni declaraciones.

## 10. Descargar o importar un Excel

Abre **Datos y Excel**. Allí encontrarás tres acciones:

1. **Descargar Excel maestro:** descarga a demanda un solo libro con los datos actuales, divididos en hojas. No se crea un archivo nuevo cada vez que guardas un registro.
2. **Descargar plantilla vacía:** descarga las mismas hojas y encabezados, sin registros, para organizar datos nuevos.
3. **Importar Excel de la empresa:** selecciona un archivo `.xlsx` o `.xls` de hasta 10 MB y 10.000 filas.

El libro contiene estas hojas y encabezados:

| Hoja | Columnas principales |
|---|---|
| Empresa | Nombre o razón social, NIT, Ciudad, Actividad |
| Contactos | ID, Nombre, Tipo, Identificación, Correo, Teléfono |
| Productos | ID, SKU, Nombre, Tipo, Unidad, Existencia, Mínimo, Costo unitario COP, Precio COP, Tipo de IVA, Tarifa IVA % |
| Recetas | Producto SKU, Material SKU, Cantidad por unidad |
| Ventas | ID, Número, Cliente, Fecha, Total COP, IVA %, Estado, Forma de pago, Fecha de pago, Medio de pago |
| Detalle de ventas | Número de venta, Producto SKU, Cantidad |
| Compras | ID, Número, Proveedor, Fecha, Total COP, Estado, Detalle, Producto SKU, Cantidad |
| Producción | ID, Número de orden, Producto SKU, Producto, Cantidad, Fecha, Estado, Desperdicio kg, Fecha de terminación |
| Consumos de producción | Número de orden, Material SKU, Cantidad consumida |
| Impacto ambiental | Período, consumos, residuos, reciclado o reutilizado, producción, origen, método y fecha de confirmación de energía y agua |
| Datos adicionales | Entidad, Clave del registro, Campo original, Valor |

Al importar, Pyme360 intenta reconocer los nombres de las hojas y encabezados. Revisa cada hoja, elige qué información contiene y corrige la fila de encabezados o las columnas si hace falta. La muestra y el resumen te permiten revisar el resultado antes de guardar.

- Las coincidencias por NIT, SKU, número de documento o nombre y tipo se presentan como duplicados. Se omiten por defecto.
- Marca **Actualizar duplicados** solo si quieres completar o actualizar datos. Las celdas vacías del archivo no borran datos guardados.
- Las filas que no encuentran un cliente, proveedor, producto o documento relacionado quedan **por revisar** y no se importan. Registra o corrige esa referencia y vuelve a importar el archivo.
- Las columnas que no asignes se conservan en **Datos adicionales**, vinculadas al registro, y vuelven a salir en el Excel maestro.
- Pulsa **Cancelar** para salir sin guardar. Si el archivo tiene errores o no cabe en el almacenamiento, Pyme360 no aplica la importación.

El libro se genera o lee dentro del navegador; el archivo no se sube a un servidor. Incluye datos principales de negocio y campos adicionales, pero no preferencias ni actividad reciente. Conserva el Excel descargado en un lugar seguro como copia de trabajo.

Los botones CSV existentes en Inventario, Impacto ambiental y Finanzas siguen disponibles para exportar esos resúmenes por separado.

## 11. Si no puedes registrar algo

| Lo que ves | Qué hacer |
|---|---|
| La venta pide un cliente o producto | Pulsa **Agregar cliente** o **Agregar producto** en el aviso y completa ese dato primero. |
| La compra pide proveedor o producto | Agrega un contacto de tipo proveedor y una materia prima o insumo. |
| Producción indica que falta preparar el inventario | Crea primero los materiales y el producto terminado con su receta. |
| El inventario no alcanza | Recibe una compra o registra un ajuste después de verificar la cantidad real. |
| Un registro aparece en cero | Registra el período o movimiento; la pantalla no trae valores precargados. |
| No aparece una factura aceptada por la DIAN | La demostración no está conectada a DIAN; no transmitió la venta. |
| La referencia ONU dice que no se pudo conectar | Inicia Pyme360 con el lanzador de tu sistema y deja abierta la ventana de terminal. Se abrirá una dirección local nueva; usa esa pestaña en vez de `index.html` abierto como archivo. Si hay un error al iniciar, la ventana se queda abierta para mostrarlo. |

## 12. Cuidado de tus datos en esta demostración

- Los datos de tu empresa se guardan en el navegador y dispositivo donde usas el archivo. No aparecen automáticamente en otro computador o navegador. La consulta externa se limita a datos públicos agregados de la ONU ODS 7.3.1.
- No hay usuarios, permisos ni separación entre cuentas. No ingreses información confidencial o datos reales de clientes en esta versión de prueba.
- No borres los datos del sitio ni la clave local `pyme360.demo.v2` si necesitas conservar lo que registraste.
- La demostración no tiene recuperación desde copias en la nube. Descarga periódicamente el Excel maestro para conservar una copia de trabajo.
- Para volver a empezar desde cero, elimina `pyme360.demo.v2` del almacenamiento local del navegador y recarga la página. Esa acción borra los datos de esta demostración en ese navegador.

## Funciones pendientes de la versión conectada

Esta versión no incluye inicio de sesión, cuentas separadas por empresa, varias bodegas configurables, edición o borrado de registros, integración con DIAN, conexión con bancos, nómina, contabilidad formal completa ni envío de reportes ambientales a autoridades. Las tarifas tributarias, requisitos de facturación y obligaciones ambientales deben revisarse con el contador y el asesor ambiental de la empresa.
