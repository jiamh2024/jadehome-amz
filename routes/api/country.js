// routes/countryRouter.js
const express = require('express');
const db = require('../../db/db.js'); // Import your existing db module

const router = express.Router();

// 1. CREATE - Add a new country
router.post('/', async (req, res) => {
  try {
    const {
      country_name,
      country_code,
      currency_unit,
      currency_code,
      exchange_rate_to_cny,
      vat_rate,
      amz_commission_rate,
      shipping_cost,
      length_unit,
      weight_unit,
      local_delivery_rules
    } = req.body;

    const sql = `
      INSERT INTO country (
        country_name, country_code, currency_unit, currency_code,
        exchange_rate_to_cny, vat_rate, amz_commission_rate,
        shipping_cost, length_unit, weight_unit, local_delivery_rules
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      country_name,
      country_code,
      currency_unit,
      currency_code,
      exchange_rate_to_cny,
      vat_rate,
      amz_commission_rate,
      shipping_cost,
      length_unit,
      weight_unit,
      local_delivery_rules
    ];

    const result = await db.query(sql, params);
    res.status(201).json({ message: 'Country added successfully', id: result.insertId });
  } catch (error) {
    console.error('Error adding country:', error);
    res.status(500).json({ 
      error: 'Failed to add country',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 2. READ - Get all countries or specific country by code
router.get('/', async (req, res) => {
  try {
    const { country_code } = req.query;
    let sql = 'SELECT * FROM country';
    let params = [];

    if (country_code) {
      sql += ' WHERE country_code = ?';
      params.push(country_code);
    }

    sql += ' ORDER BY country_name';

    const countries = await db.query(sql, params);
    res.json(countries);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ 
      error: 'Failed to fetch countries',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 3. READ - Get single country by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = 'SELECT * FROM country WHERE id = ?';
    const [country] = await db.query(sql, [id]);

    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }

    res.json(country);
  } catch (error) {
    console.error('Error fetching country:', error);
    res.status(500).json({ 
      error: 'Failed to fetch country',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 4. UPDATE - Update a country
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      country_name,
      country_code,
      currency_unit,
      currency_code,
      exchange_rate_to_cny,
      vat_rate,
      amz_commission_rate,
      shipping_cost,
      length_unit,
      weight_unit,
      local_delivery_rules
    } = req.body;

    const sql = `
      UPDATE country SET
        country_name = ?,
        country_code = ?,
        currency_unit = ?,
        currency_code = ?,
        exchange_rate_to_cny = ?,
        vat_rate = ?,
        amz_commission_rate = ?,
        shipping_cost = ?,
        local_delivery_rules = ?,
        length_unit = ?,
        weight_unit = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const params = [
      country_name,
      country_code,
      currency_unit,
      currency_code,
      exchange_rate_to_cny,
      vat_rate,
      amz_commission_rate,
      shipping_cost,
      length_unit,
      weight_unit,
      local_delivery_rules,
      id
    ];

    const result = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Country not found' });
    }

    res.json({ message: 'Country updated successfully' });
  } catch (error) {
    console.error('Error updating country:', error);
    res.status(500).json({ 
      error: 'Failed to update country',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 5. DELETE - Delete a country
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = 'DELETE FROM country WHERE id = ?';
    const result = await db.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Country not found' });
    }

    res.json({ message: 'Country deleted successfully' });
  } catch (error) {
    console.error('Error deleting country:', error);
    res.status(500).json({ 
      error: 'Failed to delete country',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;