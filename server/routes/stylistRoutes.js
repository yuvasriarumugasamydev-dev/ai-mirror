import express from 'express';
import { requestStylist } from '../controllers/stylistController.js';

const router = express.Router();

router.post('/call', requestStylist);

export default router;
