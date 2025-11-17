import express from 'express';
import { getAllResources, getDictionary, getPredefined } from '../controllers/resourceController.js';

const router = express.Router();

router.get('/all', getAllResources);
router.get('/dictionary', getDictionary);
router.get('/predefined', getPredefined);

export default router;
