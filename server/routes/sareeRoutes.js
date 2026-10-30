import express from 'express';
import {
  getAllSarees,
  getSareeById,
  addSaree,
  deleteSaree,
  generateSareeTryOnImage,
  updateSareeTryOnImage
} from '../controllers/sareeController.js';

const router = express.Router();

router.get('/', getAllSarees);
router.post('/', addSaree);
router.get('/:id', getSareeById);
router.delete('/:id', deleteSaree);
router.post('/:id/generate-tryon-image', generateSareeTryOnImage);
router.put('/:id/tryon-image', updateSareeTryOnImage);

export default router;
