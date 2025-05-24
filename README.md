# Proyecto TFG

## Descripción
Este proyecto es parte de nuestro Trabajo de Fin de Grado (TFG). El objetivo del proyecto es representar en tiempo real aerogeneradores (Onshore y Offshore).

## Estructura del Proyecto
- `/db`: Conexión base de datos MongoDB
- `/public`: Archivos estáticos que el servidor entrega directamente al cliente
- `/routes`: API RESTful con CRUD y endpoints 
- `/simulacion`: Generador de datos JSON a partir de MatLab
- `/views`: Vistas principales del proyecto
- `/views/logica`: Modificaciones sobre librerias(NASA WorlWind WebWorldWind y Spill the beans)

## Instalación
Para instalar las dependencias del proyecto, ejecuta el siguiente comando:

```bash
npm install
```

## Ejemplo de Base de Datos

Para utilizar correctamente el proyecto, es necesario importar en MongoDB las colecciones que se encuentran en la carpeta `/bbdd-ejemplo`. Estas colecciones contienen datos de ejemplo que facilitan la puesta en marcha y pruebas del sistema.

En particular, la colección **Molinos** es de tipo *Time Series* y está indexada por los campos `idMolino` y `timestamp`. Esto permite almacenar y consultar eficientemente los datos históricos de cada aerogenerador.

Asegúrate de importar todas las colecciones proporcionadas antes de ejecutar el proyecto.

## Uso
Para ejecutar el proyecto, utiliza el siguiente comando:

```bash
npm start
```

## Contacto
Para cualquier consulta, puedes contactarnos en:

- joseantoniotortosatic@gmail.com
- airammarp@gmail.com
