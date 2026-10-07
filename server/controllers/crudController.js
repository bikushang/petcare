/**
 * Generic CRUD controller factory.
 * Generates list, get-by-id, create, update, and delete handlers
 * for any Mongoose model. Keeps controllers DRY across all resources.
 *
 * The frontend generates its own string IDs (e.g. "apt_xyz") and sends
 * them in the body. We store that as _id so client and server stay in sync.
 */
const asyncHandler = require('../middleware/asyncHandler');

const SENSITIVE_FIELDS = ['password', 'resetToken', 'resetTokenExpiry'];

function cleanDoc(d) {
  const obj = { ...d, id: d._id.toString() };
  for (const f of SENSITIVE_FIELDS) delete obj[f];
  return obj;
}

function createCrudController(Model) {
  return {
    list: asyncHandler(async (req, res) => {
      const filter = {};
      for (const key of Object.keys(req.query)) {
        if (Model.schema.path(key)) {
          filter[key] = req.query[key];
        }
      }
      const docs = await Model.find(filter).lean();
      res.json(docs.map(cleanDoc));
    }),

    getById: asyncHandler(async (req, res) => {
      const doc = await Model.findById(req.params.id).lean();
      if (!doc) return res.status(404).json({ error: 'NOT_FOUND', message: 'Resource not found' });
      res.json(cleanDoc(doc));
    }),

    create: asyncHandler(async (req, res) => {
      const body = { ...req.body };
      if (body.id && !body._id) {
        body._id = body.id;
      }
      delete body.id;
      for (const f of SENSITIVE_FIELDS) delete body[f];
      const doc = await Model.create(body);
      const obj = doc.toObject();
      res.status(201).json(cleanDoc(obj));
    }),

    update: asyncHandler(async (req, res) => {
      const body = { ...req.body };
      delete body.id;
      delete body._id;
      for (const f of SENSITIVE_FIELDS) delete body[f];
      const doc = await Model.findByIdAndUpdate(
        req.params.id,
        { $set: body },
        { new: true, runValidators: true },
      ).lean();
      if (!doc) return res.status(404).json({ error: 'NOT_FOUND', message: 'Resource not found' });
      res.json(cleanDoc(doc));
    }),

    remove: asyncHandler(async (req, res) => {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ error: 'NOT_FOUND', message: 'Resource not found' });
      res.json({ success: true, id: req.params.id });
    }),
  };
}

module.exports = createCrudController;
