const express = require('express');
const { aggregate } = require('../controllers/aggregateController');
const { seed, forceSeed } = require('../controllers/seedController');

const router = express.Router();

router.get('/aggregate', aggregate);
router.post('/seed', seed);
router.post('/force-seed', forceSeed);

module.exports = router;
