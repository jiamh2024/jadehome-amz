const express = require('express');
const router = express.Router();
const db = require('../../db/db.js');

// Create Component
router.post('/', async (req, res) => {
  try {
    const { sku_code, supplier, supplier_impression, core_specs, features_usage, 
            purchase_price, currency, weight, inventory_quantity, length, width, height, remarks } = req.body;

    const result = await db.query(
      `INSERT INTO component 
       (sku_code, supplier, supplier_impression, core_specs, features_usage, 
        purchase_price, currency, weight, inventory_quantity, length, width, height, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sku_code, supplier, supplier_impression, core_specs, features_usage,
       purchase_price, currency, weight, inventory_quantity || 0, length, width, height, remarks]
    );

    res.status(201).json({
      success: true,
      data: { component_id: result.insertId }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Component SKU code already exists'
      });
    }
    handleServerError(res, err);
  }
});

// Get All Components (with pagination)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [components, total] = await Promise.all([
      db.query(
        `SELECT * FROM component 
         WHERE is_active = 1
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      ),
      db.query('SELECT COUNT(*) AS total FROM component WHERE is_active = 1')
    ]);

    res.json({
      success: true,
      data: {
        components,
        pagination: {
          page,
          limit,
          total: total[0].total,
          totalPages: Math.ceil(total[0].total / limit)
        }
      }
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

// Get Single Component by ID
router.get('/:id', async (req, res) => {
  try {
    const [component] = await db.query(
      `SELECT * FROM component 
       WHERE component_id = ? AND is_active = 1`,
      [req.params.id]
    );

    if (!component) {
      return res.status(404).json({
        success: false,
        message: 'Component not found'
      });
    }

    res.json({
      success: true,
      data: component
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

// Get Single Component by SKU Code
router.get('/code/:skuCode', async (req, res) => {
  try {
    const [component] = await db.query(
      `SELECT * FROM component 
       WHERE sku_code = ? AND is_active = 1`,
      [req.params.skuCode]
    );

    if (!component) {
      return res.status(404).json({
        success: false,
        message: 'Component not found'
      });
    }

    res.json({
      success: true,
      data: component
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

// Update Component
router.put('/:id', async (req, res) => {
  try {
    const { sku_code, supplier, supplier_impression, core_specs, features_usage, 
            purchase_price, currency, weight, inventory_quantity, length, width, height, remarks, is_active } = req.body;

    const result = await db.query(
      `UPDATE component SET
        sku_code = ?,
        supplier = ?,
        supplier_impression = ?,
        core_specs = ?,
        features_usage = ?,
        purchase_price = ?,
        currency = ?,
        weight = ?,
        inventory_quantity = ?,
        length = ?,
        width = ?,
        height = ?,
        remarks = ?,
        is_active = ?
       WHERE component_id = ? AND is_active = 1`,
      [sku_code, supplier, supplier_impression, core_specs, features_usage,
       purchase_price, currency, weight, inventory_quantity || 0, length, width, height, remarks, is_active, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Component not found or already deleted'
      });
    }

    res.json({
      success: true,
      message: 'Component updated successfully'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Component SKU code already exists'
      });
    }
    handleServerError(res, err);
  }
});

// Delete Component (Soft Delete)
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE component SET is_active = 0 
       WHERE component_id = ? AND is_active = 1`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Component not found or already deleted'
      });
    }

    res.json({
      success: true,
      message: 'Component deleted successfully'
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

// Error handler utility
function handleServerError(res, err) {
  console.error(err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
}

module.exports = router;
