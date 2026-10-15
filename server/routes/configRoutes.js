const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const Config = require('../models/Config');

const router = express.Router();

router.get(
  '/:key',
  asyncHandler(async (req, res) => {
    const doc = await Config.findOne({ key: req.params.key }).lean();
    if (!doc) return res.status(404).json({ error: 'NOT_FOUND', message: 'Config not found' });
    res.json({ key: doc.key, data: doc.data });
  }),
);

router.put(
  '/:key',
  asyncHandler(async (req, res) => {
    const doc = await Config.findOneAndUpdate(
      { key: req.params.key },
      { $set: { data: req.body } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    res.json({ key: doc.key, data: doc.data });
  }),
);

module.exports = router;
