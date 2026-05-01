const Joi = require('joi');

const uuid = Joi.string().uuid();

const supplyItem = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  quantity: Joi.number().positive().required(),
});

const clientQuickbooks = Joi.object({
  customer_id: Joi.string().allow('').max(64).optional(),
  display_name: Joi.string().allow('').max(200).optional(),
  notes: Joi.string().allow('').max(2000).optional(),
  sync_enabled: Joi.boolean().optional(),
}).optional();

const supplyImportItem = Joi.object({
  name: Joi.string().min(1).max(500).required(),
  category: Joi.string().allow('', null).max(80).optional(),
  catalog_group: Joi.string().allow('', null).max(120).optional(),
  qty_per_unit: Joi.string().allow('', null).max(80).optional(),
  case_qty: Joi.number().integer().min(0).allow(null).optional(),
  min_order_qty: Joi.number().integer().min(0).allow(null).optional(),
  min_order_unit_price: Joi.number().min(0).max(1e9).allow(null).optional(),
  discount_r_qty: Joi.number().integer().min(0).allow(null).optional(),
  discount_r_unit_price: Joi.number().min(0).max(1e9).allow(null).optional(),
  discount_n_qty: Joi.number().integer().min(0).allow(null).optional(),
  discount_n_unit_price: Joi.number().min(0).max(1e9).allow(null).optional(),
  quantity_on_hand: Joi.number().min(0).optional(),
  reorder_threshold: Joi.number().min(0).optional(),
  unit_price: Joi.number().min(0).max(1e9).allow(null).optional(),
});

const stationInventoryItem = Joi.object({
  _id: uuid.optional(),
  item_name: Joi.string().min(1).max(200).required(),
  quantity: Joi.number().min(0).required(),
  stocked_at: Joi.date().required(),
  expires_at: Joi.date().allow(null).optional(),
  is_fire_extinguisher: Joi.boolean().optional(),
  placement_note: Joi.string().allow('').max(500).optional(),
});

const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(1).required(),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),

  resetPassword: Joi.object({
    token: Joi.string().min(20).required(),
    newPassword: Joi.string().min(8).max(128).required(),
  }),

  createUser: Joi.object({
    role: Joi.string().valid('technician', 'admin').required(),
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    phone: Joi.string().allow('').optional(),
    photo_url: Joi.string().allow('').max(512).optional(),
    bio: Joi.string().allow('').max(2000).optional(),
    location: Joi.string().allow('').max(200).optional(),
    birthday: Joi.string().allow('').max(100).optional(),
    skills: Joi.array().items(Joi.string().min(1).max(80)).max(30).optional(),
  }),

  updateUser: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().allow('').optional(),
    role: Joi.string().valid('technician', 'admin').optional(),
    password: Joi.string().min(8).max(128).optional(),
    photo_url: Joi.string().allow('').max(512).optional(),
    bio: Joi.string().allow('').max(2000).optional(),
    location: Joi.string().allow('').max(200).optional(),
    birthday: Joi.string().allow('').max(100).optional(),
    skills: Joi.array().items(Joi.string().min(1).max(80)).max(30).optional(),
  }).min(1),

  updateOwnProfile: Joi.object({
    name: Joi.string().max(100).empty('').min(2).optional(),
    phone: Joi.string().allow('').optional(),
    photo_url: Joi.string().allow('').max(512).optional(),
    bio: Joi.string().allow('').max(2000).optional(),
    location: Joi.string().allow('').max(200).optional(),
    birthday: Joi.string().allow('').max(100).optional(),
    skills: Joi.array().items(Joi.string().min(1).max(80)).max(30).optional(),
    preferences: Joi.object({
      weather_theme: Joi.string()
        .valid('default', 'seasonal', 'nonseasonal', 'google', 'aurora')
        .optional(),
      dashboard_accent: Joi.string()
        .valid('teal', 'ocean', 'violet', 'ember', 'forest', 'slate')
        .optional(),
      weather_city: Joi.string().allow('').max(120).optional(),
    }).optional(),
  }).min(1),

  createCompany: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    contact_info: Joi.string().allow('').optional(),
    subscription_tier: Joi.string().valid('basic', 'growth', 'pro').optional(),
  }),

  updateCompany: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    contact_info: Joi.string().allow('').optional(),
    subscription_tier: Joi.string().valid('basic', 'growth', 'pro').optional(),
    weather_locations: Joi.array()
      .max(8)
      .items(
        Joi.object({
          label: Joi.string().trim().min(1).max(80).required(),
          query: Joi.string().trim().min(1).max(120).required(),
        })
      )
      .optional(),
  }).min(1),

  billingCheckoutSession: Joi.object({
    plan: Joi.string().valid('basic', 'growth', 'pro').required(),
  }),

  createClient: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    location: Joi.string().min(2).max(200).required(),
    contact_info: Joi.string().allow('').optional(),
    service_start_date: Joi.date().allow(null).optional(),
    service_expiry_date: Joi.date().allow(null).optional(),
    quickbooks: clientQuickbooks,
    required_supplies: Joi.array().items(supplyItem).optional(),
  }),

  updateClient: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    location: Joi.string().min(2).max(200).optional(),
    contact_info: Joi.string().allow('').optional(),
    service_start_date: Joi.date().allow(null).optional(),
    service_expiry_date: Joi.date().allow(null).optional(),
    quickbooks: clientQuickbooks,
    required_supplies: Joi.array().items(supplyItem).optional(),
  }).min(1),

  createLocation: Joi.object({
    client_id: uuid.required(),
    name: Joi.string().min(1).max(200).required(),
    address: Joi.string().allow('').max(500).optional(),
    location_code: Joi.string().allow('').max(50).optional(),
    /** At least one line required when creating a station. */
    station_inventory: Joi.array().items(stationInventoryItem).min(1).required(),
  }),

  updateLocation: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    address: Joi.string().allow('').max(500).optional(),
    location_code: Joi.string().allow('').max(50).optional(),
    station_inventory: Joi.array().items(stationInventoryItem).optional(),
  }).min(1),

  createJob: Joi.object({
    client_id: uuid.required(),
    location_id: uuid.optional(),
    location_ids: Joi.array().items(uuid).optional(),
    assigned_user_id: uuid.required(),
    description: Joi.string().max(500).allow('').optional(),
    scheduled_date: Joi.date().required(),
    planned_supplies: Joi.array().items(supplyItem).optional(),
  }),

  updateJob: Joi.object({
    description: Joi.string().max(500).allow('').optional(),
    scheduled_date: Joi.date().optional(),
    assigned_user_id: uuid.optional(),
    location_id: uuid.optional().allow(null),
    location_ids: Joi.array().items(uuid).optional(),
    status: Joi.string().valid('pending', 'in-progress').optional(),
    planned_supplies: Joi.array().items(supplyItem).optional(),
    billing_amount: Joi.number().min(0).allow(null).optional(),
  }).min(1),

  completeJob: Joi.object({
    suppliesUsed: Joi.array().items(supplyItem).optional(),
    photos: Joi.array().items(Joi.string().min(1).max(100000)).optional(),
    notes: Joi.string().allow('').max(2000).optional(),
    clientEmail: Joi.string().email().optional(),
  }),

  /**
   * Technician field workflow: increment / merge the job report’s suppliesUsed immediately,
   * without completing the job yet.
   */
  addJobInventoryUsed: Joi.object({
    items: Joi.array().items(supplyItem).min(1).required(),
  }),

  createSupply: Joi.object({
    name: Joi.string().min(1).max(500).required(),
    category: Joi.string().allow('', null).max(80).optional(),
    catalog_group: Joi.string().allow('', null).max(120).optional(),
    qty_per_unit: Joi.string().allow('', null).max(80).optional(),
    case_qty: Joi.number().integer().min(0).allow(null).optional(),
    min_order_qty: Joi.number().integer().min(0).allow(null).optional(),
    min_order_unit_price: Joi.number().min(0).max(1e9).allow(null).optional(),
    discount_r_qty: Joi.number().integer().min(0).allow(null).optional(),
    discount_r_unit_price: Joi.number().min(0).max(1e9).allow(null).optional(),
    discount_n_qty: Joi.number().integer().min(0).allow(null).optional(),
    discount_n_unit_price: Joi.number().min(0).max(1e9).allow(null).optional(),
    quantity_on_hand: Joi.number().min(0).default(0),
    reorder_threshold: Joi.number().min(0).default(5),
    unit_price: Joi.number().min(0).max(1e9).allow(null).optional(),
  }),

  updateSupply: Joi.object({
    name: Joi.string().min(1).max(500).optional(),
    category: Joi.string().allow('', null).max(80).optional(),
    catalog_group: Joi.string().allow('', null).max(120).optional(),
    qty_per_unit: Joi.string().allow('', null).max(80).optional(),
    case_qty: Joi.number().integer().min(0).allow(null).optional(),
    min_order_qty: Joi.number().integer().min(0).allow(null).optional(),
    min_order_unit_price: Joi.number().min(0).max(1e9).allow(null).optional(),
    discount_r_qty: Joi.number().integer().min(0).allow(null).optional(),
    discount_r_unit_price: Joi.number().min(0).max(1e9).allow(null).optional(),
    discount_n_qty: Joi.number().integer().min(0).allow(null).optional(),
    discount_n_unit_price: Joi.number().min(0).max(1e9).allow(null).optional(),
    quantity_on_hand: Joi.number().min(0).optional(),
    reorder_threshold: Joi.number().min(0).optional(),
    unit_price: Joi.number().min(0).max(1e9).allow(null).optional(),
  }).min(1),

  supplyImportPreview: Joi.object({
    items: Joi.array().items(supplyImportItem).min(1).max(5000).required(),
  }),

  supplyImportCommit: Joi.object({
    items: Joi.array().items(supplyImportItem).min(1).max(5000).required(),
    file_name: Joi.string().allow('', null).max(255).optional(),
  }),

  supplyExportEmail: Joi.object({
    recipient: Joi.string().email().required(),
    include_all: Joi.boolean().optional(),
    item_ids: Joi.array().items(uuid).max(5000).optional(),
  }).custom((value, helpers) => {
    const includeAll = Boolean(value.include_all);
    const ids = Array.isArray(value.item_ids) ? value.item_ids : [];
    if (!includeAll && ids.length === 0) {
      return helpers.error('any.invalid');
    }
    return value;
  }, 'inventory export selection validation')
    .messages({
      'any.invalid': 'Select at least one inventory item or set include_all=true',
    }),

  createPaymentIntent: Joi.object({
    job_id: uuid.required(),
    amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().valid('usd').default('usd'),
  }),
};

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return res.status(400).json({
        error: 'Validation Error',
        details,
      });
    }

    req.validatedData = value;
    next();
  };
};

module.exports = { validate, schemas };
