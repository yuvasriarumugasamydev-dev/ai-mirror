import express from 'express';
import {
  getAllSarees,
  getSareeById,
  generateSareeTryOnImage,
  updateSareeTryOnImage
} from '../controllers/sareeController.js';

const router = express.Router();

router.get('/', getAllSarees);
router.get('/:id', getSareeById);
router.post('/:id/generate-tryon-image', generateSareeTryOnImage);
router.put('/:id/tryon-image', updateSareeTryOnImage);

export default router;
