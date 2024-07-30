import { Router } from 'express';
import { generateDbml } from '../controllers/dbmlController';

const router = Router();

router.post('/generate-dbml', generateDbml);

export default router;