import express from 'express';
import { getBuildNote, setBuildNote, deleteBuildNote } from '../controllers/buildNoteController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getBuildNote);
router.post('/', authMiddleware, setBuildNote);
router.delete('/', authMiddleware, deleteBuildNote);

export default router;
