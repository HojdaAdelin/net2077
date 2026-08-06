import Terms from '../models/Terms.js';

export const getTerms = async (req, res) => {
  try {
    const terms = await Terms.findOne().sort({ uploadedAt: -1 });
    if (!terms) return res.json({ terms: null });
    res.json({ terms });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const uploadTerms = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'object') {
      return res.status(400).json({ message: 'Invalid JSON content' });
    }
    await Terms.deleteMany({});
    const terms = await Terms.create({ content });
    res.json({ success: true, terms });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const downloadTerms = async (req, res) => {
  try {
    const terms = await Terms.findOne().sort({ uploadedAt: -1 });
    if (!terms) return res.status(404).json({ message: 'No terms found' });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="terms.json"');
    res.send(JSON.stringify(terms.content, null, 2));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
