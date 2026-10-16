const express = require('express');
const router = express.Router();
const db = require('../../db/db.js');

// Handle server errors
const handleServerError = (res, err) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};

// Create BOM entry
router.post('/', async (req, res) => {
  try {
    const { sku_id, component_id, quantity, unit, usage_note } = req.body;

    // Check if SKU exists
    const [sku] = await db.query('SELECT * FROM product_sku WHERE sku_id = ? AND is_active = 1', [sku_id]);
    if (!sku) {
      return res.status(404).json({
        success: false,
        message: 'Product SKU not found'
      });
    }

    // Check if component exists
    const [component] = await db.query('SELECT * FROM component WHERE component_id = ? AND is_active = 1', [component_id]);
    if (!component) {
      return res.status(404).json({
        success: false,
        message: 'Component not found'
      });
    }

    // Check if BOM entry already exists
    const [existing] = await db.query(
      'SELECT * FROM bom WHERE sku_id = ? AND component_id = ?',
      [sku_id, component_id]
    );
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'BOM entry already exists for this SKU and component'
      });
    }

    const result = await db.query(
      `INSERT INTO bom (sku_id, component_id, quantity, unit, usage_note)
       VALUES (?, ?, ?, ?, ?)`,
      [sku_id, component_id, quantity, unit || 'pcs', usage_note]
    );

    res.status(201).json({
      success: true,
      data: { bom_id: result.insertId }
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

// Get All BOM entries (with pagination and joins)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [boms, total] = await Promise.all([
      db.query(
        `SELECT b.*, 
               p.sku_code AS product_sku, p.product_name,
               c.sku_code AS component_sku, c.core_specs, c.purchase_price
        FROM bom b
        JOIN product_sku p ON b.sku_id = p.sku_id AND p.is_active = 1
        JOIN component c ON b.component_id = c.component_id AND c.is_active = 1
        WHERE b.is_active = 1
        ORDER BY b.created_at DESC
        LIMIT ? OFFSET ?`,
        [limit, offset]
      ),
      db.query('SELECT COUNT(*) AS total FROM bom WHERE is_active = 1')
    ]);

    res.json({
      success: true,
      data: {
        boms,
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

// Get BOM entries for a specific product
router.get('/product/:sku_id', async (req, res) => {
  try {
    const [boms] = await db.query(
      `SELECT b.*, 
             c.component_id, c.sku_code AS component_sku, c.core_specs, 
             c.purchase_price, c.supplier, c.weight
      FROM bom b
      JOIN component c ON b.component_id = c.component_id AND c.is_active = 1
      WHERE b.sku_id = ? AND b.is_active = 1
      ORDER BY c.sku_code`,
      [req.params.sku_id]
    );

    res.json({
      success: true,
      data: { boms }
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

// Get Single BOM entry by ID
router.get('/:id', async (req, res) => {
  try {
    const [bom] = await db.query(
      `SELECT b.*, 
             p.sku_code AS product_sku, p.product_name,
             c.sku_code AS component_sku, c.core_specs, c.purchase_price
      FROM bom b
      JOIN product_sku p ON b.sku_id = p.sku_id AND p.is_active = 1
      JOIN component c ON b.component_id = c.component_id AND c.is_active = 1
      WHERE b.bom_id = ? AND b.is_active = 1`,
      [req.params.id]
    );

    if (!bom) {
      return res.status(404).json({
        success: false,
        message: 'BOM entry not found'
      });
    }

    res.json({
      success: true,
      data: bom
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

// Update BOM entry
router.put('/:id', async (req, res) => {
  try {
    const { quantity, unit, usage_note } = req.body;

    // Check if BOM entry exists
    const [existing] = await db.query('SELECT * FROM bom WHERE bom_id = ? AND is_active = 1', [req.params.id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'BOM entry not found'
      });
    }

    const result = await db.query(
      `UPDATE bom 
       SET quantity = ?, unit = ?, usage_note = ?
       WHERE bom_id = ?`,
      [quantity, unit || 'pcs', usage_note, req.params.id]
    );

    res.json({
      success: true,
      message: 'BOM entry updated successfully'
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

// Delete BOM entry (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE bom SET is_active = 0 WHERE bom_id = ?`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'BOM entry not found'
      });
    }

    res.json({
      success: true,
      message: 'BOM entry deleted successfully'
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

module.exports = router;
