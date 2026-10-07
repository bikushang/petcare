const express = require('express');
const { aggregate } = require('../controllers/aggregateController');
const { seed } = require('../controllers/seedController');

const router = express.Router();

router.get('/aggregate', aggregate);
router.post('/seed', seed);

module.exports = router;
