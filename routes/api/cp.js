const express = require('express');
const router = express.Router();
const db = require('../../db/db.js'); // 假设你已经有一个db模块

/**
 * @swagger
 * tags:
 *   name: Competitors
 *   description: 竞品信息管理
 */

/**
 * @swagger
 * /api/competitors:
 *   post:
 *     summary: 新增竞品信息
 *     tags: [Competitors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_name
 *               - brand
 *               - country_code
 *               - sale_price
 *             properties:
 *               product_name:
 *                 type: string
 *                 description: 产品规格名称
 *               brand:
 *                 type: string
 *                 description: 品牌
 *               country_code:
 *                 type: string
 *                 description: 国家代码(2字母)
 *               sale_price:
 *                 type: number
 *                 description: 销售价格
 *               length_cm:
 *                 type: number
 *                 description: 长度(cm)
 *               width_mm:
 *                 type: number
 *                 description: 宽度(mm)
 *               height_cm:
 *                 type: number
 *                 description: 高度(cm)
 *               weight_kg:
 *                 type: number
 *                 description: 重量(kg)
 *               has_battery:
 *                 type: boolean
 *                 description: 是否带电
 *     responses:
 *       201:
 *         description: 竞品创建成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
router.post('/', async (req, res) => {
  try {
    const {
      product_name,
      brand,
      country_code,
      sale_price,
      length = null,
      width = null,
      height = null,
      weight = null,
      has_battery = false
    } = req.body;

    // 验证必填字段
    if (!product_name || !brand || !country_code || sale_price === undefined) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const sql = `
      INSERT INTO product_cp (
        product_name, brand, country_code, sale_price,
        length, width, height, weight, has_battery
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      product_name,
      brand,
      country_code.toUpperCase(),
      sale_price,
      length,
      width,
      height,
      weight,
      has_battery ? 1 : 0
    ];

    const result = await db.query(sql, params);
    
    res.status(201).json({
      message: '竞品添加成功',
      id: result.insertId,
      data: {
        id: result.insertId,
        ...req.body,
        has_battery: Boolean(has_battery)
      }
    });
  } catch (error) {
    console.error('添加竞品错误:', error);
    res.status(500).json({ 
      error: '添加竞品失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * /api/competitors:
 *   get:
 *     summary: 查询竞品列表
 *     tags: [Competitors]
 *     parameters:
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: 按品牌筛选
 *       - in: query
 *         name: country_code
 *         schema:
 *           type: string
 *         description: 按国家代码筛选
 *       - in: query
 *         name: has_battery
 *         schema:
 *           type: boolean
 *         description: 按是否带电筛选
 *     responses:
 *       200:
 *         description: 竞品列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Competitor'
 *       500:
 *         description: 服务器错误
 */
router.get('/', async (req, res) => {
  try {
    const { brand, country_code, has_battery } = req.query;
    
    let sql = 'SELECT * FROM product_cp WHERE 1=1';
    const params = [];
    
    if (brand) {
      sql += ' AND brand LIKE ?';
      params.push(`%${brand}%`);
    }
    
    if (country_code) {
      sql += ' AND country_code = ?';
      params.push(country_code.toUpperCase());
    }
    
    if (has_battery !== undefined) {
      sql += ' AND has_battery = ?';
      params.push(has_battery === 'true' ? 1 : 0);
    }
    
    sql += ' ORDER BY product_name';
    
    const competitors = await db.query(sql, params);
    
    // 转换has_battery为布尔值
    const result = competitors.map(comp => ({
      ...comp,
      has_battery: Boolean(comp.has_battery)
    }));
    
    res.json(result);
  } catch (error) {
    console.error('查询竞品错误:', error);
    res.status(500).json({ 
      error: '获取竞品列表失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * /api/competitors/{id}:
 *   get:
 *     summary: 获取单个竞品详情
 *     tags: [Competitors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 竞品ID
 *     responses:
 *       200:
 *         description: 竞品详情
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Competitor'
 *       404:
 *         description: 竞品未找到
 *       500:
 *         description: 服务器错误
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = 'SELECT * FROM product_cp WHERE id = ?';
    const [competitor] = await db.query(sql, [id]);
    
    if (!competitor) {
      return res.status(404).json({ error: '竞品未找到' });
    }
    
    res.json({
      ...competitor,
      has_battery: Boolean(competitor.has_battery)
    });
  } catch (error) {
    console.error('获取竞品详情错误:', error);
    res.status(500).json({ 
      error: '获取竞品详情失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * /api/competitors/{id}:
 *   delete:
 *     summary: 删除竞品
 *     tags: [Competitors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 竞品ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 竞品未找到
 *       500:
 *         description: 服务器错误
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 先检查是否存在
    const checkSql = 'SELECT id FROM product_cp WHERE id = ?';
    const [exists] = await db.query(checkSql, [id]);
    
    if (!exists) {
      return res.status(404).json({ error: '竞品未找到' });
    }
    
    const deleteSql = 'DELETE FROM product_cp WHERE id = ?';
    await db.query(deleteSql, [id]);
    
    res.json({ message: '竞品删除成功' });
  } catch (error) {
    console.error('删除竞品错误:', error);
    res.status(500).json({ 
      error: '删除竞品失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Competitor:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 竞品ID
 *         product_name:
 *           type: string
 *           description: 产品规格名称
 *         brand:
 *           type: string
 *           description: 品牌
 *         country_code:
 *           type: string
 *           description: 国家代码(2字母)
 *         sale_price:
 *           type: number
 *           description: 销售价格
 *         length_cm:
 *           type: number
 *           description: 长度(cm)
 *         width_mm:
 *           type: number
 *           description: 宽度(mm)
 *         height_cm:
 *           type: number
 *           description: 高度(cm)
 *         weight_kg:
 *           type: number
 *           description: 重量(kg)
 *         has_battery:
 *           type: boolean
 *           description: 是否带电
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 */

module.exports = router;