const express = require('express');
const router = express.Router();
const db = require('../../db/db.js');
const { validateSku } = require('../../validators/skuValidator');

// Create SKU
router.post('/', validateSku, async (req, res) => {
  try {
    const { sku_code, product_name, length, width, height, weight, 
            has_battery, battery_type, purchase_cost, currency, asin } = req.body;

    const result = await db.query(
      `INSERT INTO product_sku 
       (sku_code, product_name, length, width, height, weight, 
        has_battery, battery_type, purchase_cost, currency, asin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sku_code, product_name, length, width, height, weight,
       has_battery, battery_type, purchase_cost, currency, asin || null]
    );

    res.status(201).json({
      success: true,
      data: { sku_id: result.insertId }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'SKU code already exists'
      });
    }
    handleServerError(res, err);
  }
});

// Get All SKUs (with pagination)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [skus, total] = await Promise.all([
      db.query(
        `SELECT * FROM product_sku 
         WHERE is_active = 1
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      ),
      db.query('SELECT COUNT(*) AS total FROM product_sku WHERE is_active = 1')
    ]);

    res.json({
      success: true,
      data: {
        skus,
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

// Get Single SKU by ID
router.get('/:id', async (req, res) => {
  try {
    const [sku] = await db.query(
      `SELECT * FROM product_sku 
       WHERE sku_id = ? AND is_active = 1`,
      [req.params.id]
    );

    if (!sku) {
      return res.status(404).json({
        success: false,
        message: 'SKU not found'
      });
    }

    res.json({
      success: true,
      data: sku
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

// Get Single SKU by SKU Code
router.get('/code/:skuCode', async (req, res) => {
  try {
    const [sku] = await db.query(
      `SELECT * FROM product_sku 
       WHERE sku_code = ? AND is_active = 1`,
      [req.params.skuCode]
    );

    if (!sku) {
      return res.status(404).json({
        success: false,
        message: 'SKU not found'
      });
    }

    res.json({
      success: true,
      data: sku
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

// Update SKU
router.put('/:id', validateSku, async (req, res) => {
  try {
    const { sku_code, product_name, length, width, height, weight, 
            has_battery, battery_type, purchase_cost, currency, asin } = req.body;

    const result = await db.query(
      `UPDATE product_sku SET
        sku_code = ?,
        product_name = ?,
        length = ?,
        width = ?,
        height = ?,
        weight = ?,
        has_battery = ?,
        battery_type = ?,
        purchase_cost = ?,
        currency = ?,
        asin = ?
       WHERE sku_id = ? AND is_active = 1`,
      [sku_code, product_name, length, width, height, weight,
       has_battery, battery_type, purchase_cost, currency, asin || null, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'SKU not found or already deleted'
      });
    }

    res.json({
      success: true,
      message: 'SKU updated successfully'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'SKU code already exists'
      });
    }
    handleServerError(res, err);
  }
});

// Delete SKU (Soft Delete)
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE product_sku SET is_active = 0 
       WHERE sku_id = ? AND is_active = 1`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'SKU not found or already deleted'
      });
    }

    res.json({
      success: true,
      message: 'SKU deleted successfully'
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