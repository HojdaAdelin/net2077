import express from 'express';
import { getAllResources, getPredefined, getRoadmaps } from '../controllers/resourceController.js';

const router = express.Router();

router.get('/all', getAllResources);
router.get('/predefined', getPredefined);
router.get('/roadmaps', getRoadmaps);

export default router;
