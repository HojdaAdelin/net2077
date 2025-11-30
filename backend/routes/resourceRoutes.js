import express from 'express';
import { getAllResources, getDictionary, getPredefined, getRoadmapByTitle } from '../controllers/resourceController.js';

const router = express.Router();

router.get('/all', getAllResources);
router.get('/dictionary', getDictionary);
router.get('/predefined', getPredefined);
router.get('/roadmap/:title', getRoadmapByTitle);

export default router;
