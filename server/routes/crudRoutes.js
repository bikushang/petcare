/**
 * Express router factory for a generic CRUD resource.
 * Generates standard REST routes for any model.
 */
const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const createCrudController = require('../controllers/crudController');

function createCrudRoutes(Model) {
  const router = express.Router();
  const ctrl = createCrudController(Model);

  router.get('/', ctrl.list);
  router.get('/:id', ctrl.getById);
  router.post('/', ctrl.create);
  router.put('/:id', ctrl.update);
  router.delete('/:id', ctrl.remove);

  return router;
}

module.exports = createCrudRoutes;
