import express from 'express';
import bodyParser from 'body-parser';
import dbmlRoutes from './routes/dbmlRoutes';

const app = express();
app.use(bodyParser.json());

app.use('/api', dbmlRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`El servidor se está ejecutando en el puerto ${PORT}`);
});