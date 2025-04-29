// routes/shippingApi.js
const express = require('express');
const router = express.Router();
const shippingCalculator = require('../../funcs/shipping-funs.js');

router.get('/', async (req, res) => {
  try {
    const {
      country_code,
      length,
      width,
      height,
      weight
    } = req.body;

    // 验证必填参数
    if (!country_code || length === undefined || width === undefined || 
        height === undefined || weight === undefined) {
      return res.status(400).json({ error: '缺少必填参数' });
    }

    let fee = 0;

    if (country_code === 'US') {
      // 计算运费
      fee = shippingCalculator.calculateUSShippingFee(
        length, width, height, weight
      );
    } else {
      // 其他国家可以在这里添加对应的计算逻辑
      return res.status(400).json({ error: '暂不支持该国家的物流计算' });
    }

    res.json({
      fee
    });

  } catch (error) {
    console.error('计算物流费用错误:', error);
    res.status(500).json({ 
      error: '计算物流费用失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;