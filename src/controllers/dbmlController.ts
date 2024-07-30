import { Request, Response } from 'express';
import DbmlModel from '../models/dbmlModel';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export const generateDbml = async (req: Request, res: Response) => {
    const { server, database, username, password } = req.body;
    const dbmlModel = new DbmlModel({ server, database, username, password });

    try {
        await dbmlModel.connect();
        const dbmlContent = await dbmlModel.generateDbml();
        await dbmlModel.close();

        if (!dbmlContent.trim()) {
            console.error('El contenido de DBML está vacío y no se carga en dbdocs');
            return res.status(500).json({ error: 'El contenido de DBML está vacío y no se carga en dbdocs' });
        }

        // Guardar el contenido DBML en un archivo
        const dbmlFileName = 'database_schema.dbml';
        fs.writeFileSync(dbmlFileName, dbmlContent);
        console.log(`Contenido DBML guardado en ${dbmlFileName}`);

        // Generar un nombre de archivo y una estructura de directorio con marca de tiempo
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logDir = path.join(__dirname, '../logs', database);
        const newDbmlFileName = path.join(logDir, `${timestamp}_${database}.dbml`);

        // Crea el directorio si no existe
        fs.mkdirSync(logDir, { recursive: true });

        // Mueva el archivo DBML a la nueva ubicación
        fs.renameSync(dbmlFileName, newDbmlFileName);
        console.log(`El contenido DBML se movió a ${newDbmlFileName}`);

        // Construya y cargue el archivo DBML usando dbdocs
        const projectName = database;
        exec(`dbdocs build ${newDbmlFileName} --project ${projectName}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error al cargar DBML en dbdocs: ${error.message}`);
                return res.status(500).json({ error: error.message });
            }

            console.log('dbdocs stdout:', stdout);
            console.log('dbdocs stderr:', stderr);

            // Combine stdout y stderr para la coincidencia de patrones
            const combinedOutput = stdout + stderr;

            // Intente hacer coincidir la URL de éxito utilizando un patrón de expresión regular
            const successMessagePattern = /✔ Done\. Visit: (https:\/\/dbdocs\.io\/[^\s]+)/;
            const match = combinedOutput.match(successMessagePattern);

            if (match && match[1]) {
                const publicLink = match[1];
                res.json({ dbml: newDbmlFileName, message: 'DBML cargado a dbdocs exitosamente', link: publicLink });
            } else {
                // Si no hay coincidencia, se considera una salida inesperada.
                console.error(`Salida inesperada de dbdocs: ${combinedOutput}`);
                res.status(500).json({ error: 'Salida inesperada de dbdocs', details: combinedOutput });
            }
        });
    } catch (error: unknown) {
        console.error('Error al generar DBML:', error);
        res.status(500).json({ error: (error as Error).message });
    }
};