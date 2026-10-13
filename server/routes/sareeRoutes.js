import express from 'express';
import {
  getAllSarees,
  getSareeById,
  generateSareeTryOnImage,
  updateSareeTryOnImage,
  createSaree,
  deleteSaree
} from '../controllers/sareeController.js';

const router = express.Router();

router.get('/', getAllSarees);
router.post('/', createSaree);
router.get('/:id', getSareeById);
router.delete('/:id', deleteSaree);
router.post('/:id/generate-tryon-image', generateSareeTryOnImage);
router.put('/:id/tryon-image', updateSareeTryOnImage);

export default router;

