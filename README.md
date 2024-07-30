# DBML-API

## Descripción

DBML-API es una aplicación Node.js que se conecta a una base de datos SQL Server, genera el esquema de la base de datos en formato DBML y lo sube a [dbdocs.io](https://dbdocs.io) para su visualización y documentación.

## Estructura del Proyecto

    DBML-API
    │ .gitignore
    │ package-lock.json
    │ package.json
    │ tsconfig.json
    └───src
        ├───controllers
        |   │ dbmlController.ts
        ├───logs
        |   │ [Tu carpeta de logs aquí]
        ├───models
        |   │ dbmlModel.ts
        ├───routes
        |   │ dbmlRoutes.ts
        └───app.ts


## Requisitos Previos

- Node.js
- npm
- SQL Server
- Una cuenta en [dbdocs.io](https://dbdocs.io)

## Instalación

1. Clona este repositorio en tu máquina local:

    ```bash
    git clone https://github.com/JamilSec/dbml-api.git
    cd dbml-api
    ```

2. Instala las dependencias:

    ```bash
    npm install
    ```

3. Configura TypeScript:

    ```bash
    npx tsc --init
    ```

## Scripts Disponibles

- `npm run build`: Compila el código TypeScript en JavaScript.
- `npm start`: Inicia la aplicación en producción utilizando el código compilado.
- `npm run dev`: Inicia la aplicación en modo desarrollo utilizando `ts-node-dev`.

## Uso

1. Asegúrate de que tu base de datos SQL Server esté en funcionamiento y accesible.

2. Inicia la aplicación en modo desarrollo:

    ```bash
    npm run dev
    ```

3. Envía una solicitud POST a `http://localhost:3000/api/generate-dbml` con el siguiente cuerpo JSON:

    ```json
    {
        "server": "SERVIDOR",
        "database": "NOMBRE_BASE_DE_DATOS",
        "username": "USUARIO",
        "password": "CONTRASEÑA"
    }
    ```

    Reemplaza `"SERVIDOR"`, `"NOMBRE_BASE_DE_DATOS"`, `"USUARIO"` y `"CONTRASEÑA"` con las credenciales de tu base de datos.

## Ejemplo de Respuesta

```json
{
    "dbml": "ruta/al/archivo.dbml",
    "message": "DBML subido a dbdocs con éxito",
    "link": "https://dbdocs.io/tu-usuario/tu-proyecto"
}