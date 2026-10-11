import express from 'express';
import { saveSnapshot, getSnapshots } from '../controllers/snapshotController.js';

const router = express.Router();

router.get('/', getSnapshots);
router.post('/', saveSnapshot);

export default router;
