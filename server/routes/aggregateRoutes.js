const express = require('express');
const { aggregate } = require('../controllers/aggregateController');

const router = express.Router();

router.get('/aggregate', aggregate);

module.exports = router;
