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
6. **Anota los datos ambientales del mes.** Abre **Impacto ambiental → Registrar datos** y consulta las tendencias y recomendaciones.

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

Puedes consultar estos datos en las facturas de servicios, medidores y registros de producción.

1. Abre **Impacto ambiental** y pulsa **Registrar datos**.
2. Anota energía en kWh, agua en m³, combustible en litros y unidades producidas.
3. Anota los residuos orgánicos, aprovechables, no aprovechables y peligrosos en kg.
4. Registra cuánto se recicló o reutilizó y pulsa **Guardar datos**.
5. Revisa el resumen, los consumos por unidad producida y las ideas del mes.
6. Para descargar la información, pulsa **Descargar resumen**.

El selector de período permite consultar los meses guardados. El resumen calcula emisiones con un factor ilustrativo incluido en la demostración; **no es una medición certificada ni un reporte oficial**. Antes de usar emisiones para decisiones formales, deben configurarse factores vigentes y documentar su fuente con un asesor.

## 9. Registrar un pago y revisar finanzas

1. Abre **Finanzas** y pulsa **Registrar pago**.
2. Elige una venta pendiente, indica fecha y medio de pago.
3. Pulsa **Confirmar pago**.

La venta queda marcada como pagada. En **Finanzas** puedes revisar ingresos registrados, valores por cobrar y movimientos de ventas. Este resumen es administrativo; no reemplaza libros contables ni declaraciones.

## 10. Descargar información

- **Inventario:** en **Inventario**, pulsa **Exportar** para descargar un archivo CSV.
- **Impacto ambiental:** pulsa **Descargar resumen** para obtener los registros ambientales en CSV.
- **Finanzas:** pulsa **Exportar movimientos** para descargar las ventas en CSV.

Un archivo CSV se puede abrir en Excel u otra hoja de cálculo. La exportación es una copia de los datos incluidos; no equivale a una copia de seguridad completa del sistema.

## 11. Si no puedes registrar algo

| Lo que ves | Qué hacer |
|---|---|
| La venta pide un cliente o producto | Pulsa **Agregar cliente** o **Agregar producto** en el aviso y completa ese dato primero. |
| La compra pide proveedor o producto | Agrega un contacto de tipo proveedor y una materia prima o insumo. |
| Producción indica que falta preparar el inventario | Crea primero los materiales y el producto terminado con su receta. |
| El inventario no alcanza | Recibe una compra o registra un ajuste después de verificar la cantidad real. |
| Un registro aparece en cero | Registra el período o movimiento; la pantalla no trae valores precargados. |
| No aparece una factura aceptada por la DIAN | La demostración no está conectada a DIAN; no transmitió la venta. |

## 12. Cuidado de tus datos en esta demostración

- Los datos se guardan en el navegador y dispositivo donde usas el archivo. No aparecen automáticamente en otro computador o navegador.
- No hay usuarios, permisos ni separación entre cuentas. No ingreses información confidencial o datos reales de clientes en esta versión de prueba.
- No borres los datos del sitio ni la clave local `pyme360.demo.v2` si necesitas conservar lo que registraste.
- La demostración no tiene recuperación desde copias en la nube. Descarga los CSV que necesites conservar.
- Para volver a empezar desde cero, elimina `pyme360.demo.v2` del almacenamiento local del navegador y recarga la página. Esa acción borra los datos de esta demostración en ese navegador.

## Funciones pendientes de la versión conectada

Esta versión no incluye inicio de sesión, cuentas separadas por empresa, varias bodegas configurables, edición o borrado de registros, integración con DIAN, conexión con bancos, nómina, contabilidad formal completa ni envío de reportes ambientales a autoridades. Las tarifas tributarias, requisitos de facturación y obligaciones ambientales deben revisarse con el contador y el asesor ambiental de la empresa.
