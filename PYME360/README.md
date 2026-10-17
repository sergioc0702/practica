# Pyme360 — demostración de producto

Pyme360 es una demostración navegable de una plataforma de gestión sencilla para una pyme manufacturera colombiana. Está hecha con HTML, CSS y JavaScript sin dependencias de ejecución. Al abrirla, la empresa, los contactos, los proveedores, los productos y las operaciones empiezan vacíos para que cada usuario registre sus propios datos.

## Abrir

Abre el archivo index.html en un navegador moderno. No requiere instalación ni servidor para recorrer los flujos. Los datos creados se guardan en el almacenamiento local del navegador.

## Flujos disponibles

- Guía de uso paso a paso en [GUIA_DE_USO.md](GUIA_DE_USO.md).

- Inicio con actividad y resumen operativo.
- Registro de ventas, descuentos y pagos; el inventario se descuenta automáticamente.
- Registro de compras recibidas y actualización de existencias.
- Órdenes de producción con receta, validación de materiales, entrada de producto terminado y registro de desperdicio.
- Captura mensual de energía, agua, combustibles, producción, residuos y material aprovechado.
- Recomendaciones ambientales, indicadores por unidad producida y exportación ambiental CSV.
- Contactos, ajustes de inventario y exportación CSV de inventario y movimientos.
- Configuración inicial de empresa y creación de productos, materias primas e insumos.

## Alcance de esta demostración

Esta versión es una interfaz funcional de demostración, no una plataforma SaaS conectada. Guarda datos solamente en el navegador actual; no hay inicio de sesión ni aislamiento real por cuenta. Por eso, el espacio vacío es independiente por navegador y dispositivo, pero no representa todavía cuentas de usuario separadas en un servidor. Tampoco integra DIAN, un proveedor tecnológico, RUA, almacenamiento cloud ni API. Las emisiones usan factores ilustrativos dentro del código; deben reemplazarse por factores oficiales versionados antes de utilizar el resultado fuera de una demostración.

La arquitectura de producción prevista queda descrita en la especificación: React/TypeScript, API Django, PostgreSQL, AWS y conexión de facturación mediante proveedor tecnológico autorizado.

## Datos locales y reinicio

La versión actual guarda información bajo la clave `pyme360.demo.v2` del almacenamiento local del navegador. Para empezar de nuevo en ese navegador, elimina esa clave desde las herramientas de desarrollo y recarga la página. La clave anterior `pyme360.demo.v1`, que puede contener datos de muestra de una versión previa, se conserva y no se copia a la versión actual.
