import { ConnectionPool } from 'mssql';
import { importer } from '@dbml/core';

interface DbmlConfig {
    username: string;
    password: string;
    server: string;
    database: string;
}

class DbmlModel {
    private config: any;
    private pool: ConnectionPool | null = null;

    constructor(config: DbmlConfig) {
        this.config = {
            user: config.username,
            password: config.password,
            server: config.server,
            database: config.database,
            options: {
                encrypt: true,
                enableArithAbort: true,
                trustServerCertificate: true
            }
        };
    }

    async connect(): Promise<void> {
        try {
            this.pool = await new ConnectionPool(this.config).connect();
            console.log('Conectado a la base de datos');
        } catch (err) {
            console.error('La conexión a la base de datos falló: ', err);
        }
    }

    async fetchExistingSchemasAndTables() {
        if (!this.pool) throw new Error('No se ha establecido la conexión a la base de datos');
        try {
            const result = await this.pool.request().query(`
                SELECT TABLE_SCHEMA, TABLE_NAME
                FROM INFORMATION_SCHEMA.TABLES
            `);
            const schemas = new Set(result.recordset.map(row => row.TABLE_SCHEMA));
            const tables = new Set(result.recordset.map(row => `${row.TABLE_SCHEMA}.${row.TABLE_NAME}`));
            return { schemas, tables };
        } catch (err) {
            console.error('No se pudieron obtener los esquemas y tablas existentes: ', err);
            return { schemas: new Set(), tables: new Set() };
        }
    }

    async fetchSchema(): Promise<string> {
        if (!this.pool) throw new Error('No se ha establecido la conexión a la base de datos');
        try {
            const result = await this.pool.request().query(`
                SELECT
                  'CREATE TABLE ' + TABLE_SCHEMA + '.' + TABLE_NAME + ' (' +
                  STRING_AGG(COLUMN_NAME + ' ' + DATA_TYPE + 
                    CASE WHEN CHARACTER_MAXIMUM_LENGTH IS NOT NULL THEN '(' + CAST(CHARACTER_MAXIMUM_LENGTH AS VARCHAR) + ')' ELSE '' END +
                    CASE WHEN IS_NULLABLE = 'NO' THEN ' NOT NULL' ELSE '' END, ', ') +
                  ');' AS schema_sql
                FROM INFORMATION_SCHEMA.COLUMNS
                GROUP BY TABLE_SCHEMA, TABLE_NAME
            `);
            return result.recordset.map(row => row.schema_sql).join('\n');
        } catch (err) {
            console.error('No se pudo obtener el esquema: ', err);
            return '';
        }
    }

    async fetchForeignKeys() {
        if (!this.pool) throw new Error('No se ha establecido la conexión a la base de datos');
        try {
            const result = await this.pool.request().query(`
                SELECT
                  fk.name AS FK_NAME,
                  tp.name AS TABLE_NAME,
                  cp.name AS COLUMN_NAME,
                  tr.name AS REFERENCED_TABLE_NAME,
                  cr.name AS REFERENCED_COLUMN_NAME
                FROM 
                  sys.foreign_keys AS fk
                  INNER JOIN sys.foreign_key_columns AS fkc ON fk.object_id = fkc.constraint_object_id
                  INNER JOIN sys.tables AS tp ON fkc.parent_object_id = tp.object_id
                  INNER JOIN sys.columns AS cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
                  INNER JOIN sys.tables AS tr ON fkc.referenced_object_id = tr.object_id
                  INNER JOIN sys.columns AS cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
            `);
            return result.recordset;
        } catch (err) {
            console.error('No se pudieron obtener las claves externas: ', err);
            return [];
        }
    }

    cleanSqlSchema(sqlScript: string): string {
        const uniqueLines = Array.from(new Set(sqlScript.split('\n'))).join('\n');
        return uniqueLines
            .replace(/varchar\(-1\)/g, 'varchar(MAX)')
            .replace(/varbinary\(-1\)/g, 'varbinary(MAX)')
            .replace(/nvarchar\(-1\)/g, 'nvarchar(MAX)')
            .replace(/[^\x00-\x7F]/g, '') // Quitar non-ASCII characters
            .replace(/--.*$/gm, '') // Quitar comments
            .replace(/`/g, '') // Quitar backticks
            .replace(/\bPRIMARY KEY\b/gi, '') // Quitar PRIMARY KEY
            .replace(/\bFOREIGN KEY\b/gi, ''); // Quitar FOREIGN KEY
    }

    convertSqlToDbml(sqlScript: string): string {
        try {
            const cleanedSqlScript = this.cleanSqlSchema(sqlScript);
            const dbml = importer.import(cleanedSqlScript, 'mssql');
            return dbml;
        } catch (err) {
            console.error('No se pudo convertir SQL a DBML: ', err);
            return '';
        }
    }

    async generateDbml(): Promise<string> {
        const { schemas, tables } = await this.fetchExistingSchemasAndTables();

        const schemaSql = await this.fetchSchema();
        if (!schemaSql) {
            throw new Error('No se pudo obtener el esquema SQL');
        }

        let dbml = this.convertSqlToDbml(schemaSql);
        const foreignKeys = await this.fetchForeignKeys();

        // Agregue claves externas a DBML, pero solo si existen las tablas a las que se hace referencia
        foreignKeys.forEach(fk => {
            const { TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME } = fk;
            if (tables.has(TABLE_NAME) && tables.has(REFERENCED_TABLE_NAME)) {
                dbml += `Ref: ${TABLE_NAME}.${COLUMN_NAME} > ${REFERENCED_TABLE_NAME}.${REFERENCED_COLUMN_NAME}\n`;
            }
        });

        return dbml;
    }

    async close(): Promise<void> {
        if (this.pool) {
            await this.pool.close();
            console.log('Conexión a la base de datos cerrada');
        }
    }
}

export default DbmlModel;
