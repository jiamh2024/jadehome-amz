const { body, validationResult } = require('express-validator');

exports.validateSku = [
  body('sku_code').trim().notEmpty().withMessage('SKU code is required'),
  body('product_name').trim().notEmpty().withMessage('Product name is required'),
  body('length').isFloat({ gt: 0 }).withMessage('Length must be positive number'),
  body('width').isFloat({ gt: 0 }).withMessage('Width must be positive number'),
  body('height').isFloat({ gt: 0 }).withMessage('Height must be positive number'),
  body('weight').isFloat({ gt: 0 }).withMessage('Weight must be positive number'),
  body('has_battery').isBoolean().withMessage('has_battery must be boolean'),
  body('battery_type').isIn(['Lithium', 'Lead-acid', 'None']).withMessage('Invalid battery type'),
  body('purchase_cost').isFloat({ gt: 0 }).withMessage('Cost must be positive number'),
  body('currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('asin').optional().isLength({ min: 10, max: 10 }).withMessage('ASIN must be 10 characters'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];