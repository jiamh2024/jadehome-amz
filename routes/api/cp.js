const express = require('express');
const router = express.Router();
const db = require('../../db/db.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置文件上传存储
const uploadsDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const fileTypes = /jpeg|jpg|png|gif/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件（JPG、PNG、GIF）！'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

// 使用fields处理多个文件上传
const cpUpload = upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 }
]);

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
// 新增竞品信息 - 修改为支持文件上传
router.post('/', cpUpload, async (req, res) => {
  try {
    // 从表单数据中获取文本字段
    const { 
      product_name, brand, country_code, sale_price, 
      length, width, height, weight, has_battery 
    } = req.body;

    // 验证必填字段
    if (!product_name || !brand || !country_code || !sale_price) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    // 准备图片URL（相对于public目录）
    let image_url_1 = null;
    let image_url_2 = null;
    let image_url_3 = null;

    if (req.files && req.files['image1']) {
      image_url_1 = '/uploads/' + req.files['image1'][0].filename;
    }
    if (req.files && req.files['image2']) {
      image_url_2 = '/uploads/' + req.files['image2'][0].filename;
    }
    if (req.files && req.files['image3']) {
      image_url_3 = '/uploads/' + req.files['image3'][0].filename;
    }

    const sql = `
      INSERT INTO product_cp (
        product_name, brand, country_code, sale_price,
        length, width, height, weight, has_battery,
        image_url_1, image_url_2, image_url_3
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      product_name,
      brand,
      country_code.toUpperCase(),
      parseFloat(sale_price),
      length ? parseFloat(length) : null,
      width ? parseFloat(width) : null,
      height ? parseFloat(height) : null,
      weight ? parseFloat(weight) : null,
      has_battery === '1' || has_battery === 'true' ? 1 : 0,
      image_url_1,
      image_url_2,
      image_url_3
    ];

    const result = await db.query(sql, params);
    
    res.status(201).json({
      message: '竞品添加成功',
      id: result.insertId,
      data: {
        id: result.insertId,
        product_name,
        brand,
        country_code: country_code.toUpperCase(),
        sale_price: parseFloat(sale_price),
        length: length ? parseFloat(length) : null,
        width: width ? parseFloat(width) : null,
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        has_battery: has_battery === '1' || has_battery === 'true',
        image_url_1,
        image_url_2,
        image_url_3
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

// 在文件末尾，module.exports之前添加

/**
 * @swagger
 * /api/competitors/{id}:
 *   put:
 *     summary: 更新竞品信息
 *     tags: [Competitors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 竞品ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
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
 *               length:
 *                 type: number
 *                 description: 长度(cm)
 *               width:
 *                 type: number
 *                 description: 宽度(mm)
 *               height:
 *                 type: number
 *                 description: 高度(cm)
 *               weight:
 *                 type: number
 *                 description: 重量(kg)
 *               has_battery:
 *                 type: boolean
 *                 description: 是否带电
 *               image1:
 *                 type: string
 *                 format: binary
 *                 description: 产品图片1
 *               image2:
 *                 type: string
 *                 format: binary
 *                 description: 产品图片2
 *               image3:
 *                 type: string
 *                 format: binary
 *                 description: 产品图片3
 *     responses:
 *       200:
 *         description: 竞品更新成功
 *       400:
 *         description: 参数错误
 *       404:
 *         description: 竞品未找到
 *       500:
 *         description: 服务器错误
 */
router.put('/:id', cpUpload, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证ID
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: '无效的竞品ID' });
    }
    
    // 检查竞品是否存在
    const checkSql = 'SELECT id FROM product_cp WHERE id = ?';
    const [exists] = await db.query(checkSql, [id]);
    
    if (!exists) {
      return res.status(404).json({ error: '竞品未找到' });
    }
    
    // 从表单数据中获取字段
    const {
      product_name, brand, country_code, sale_price,
      length, width, height, weight, has_battery,
      existing_image1, existing_image2, existing_image3
    } = req.body;
    
    // 验证必填字段
    if (!product_name || !brand || !country_code || !sale_price) {
      return res.status(400).json({ error: '缺少必填字段' });
    }
    
    // 准备图片URL（优先使用新上传的图片，否则使用现有图片）
    let image_url_1 = existing_image1 || null;
    let image_url_2 = existing_image2 || null;
    let image_url_3 = existing_image3 || null;
    
    if (req.files && req.files['image1']) {
      image_url_1 = '/uploads/' + req.files['image1'][0].filename;
    }
    if (req.files && req.files['image2']) {
      image_url_2 = '/uploads/' + req.files['image2'][0].filename;
    }
    if (req.files && req.files['image3']) {
      image_url_3 = '/uploads/' + req.files['image3'][0].filename;
    }
    
    const sql = `
      UPDATE product_cp SET
        product_name = ?,
        brand = ?,
        country_code = ?,
        sale_price = ?,
        length = ?,
        width = ?,
        height = ?,
        weight = ?,
        has_battery = ?,
        image_url_1 = ?,
        image_url_2 = ?,
        image_url_3 = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const params = [
      product_name,
      brand,
      country_code.toUpperCase(),
      parseFloat(sale_price),
      length ? parseFloat(length) : null,
      width ? parseFloat(width) : null,
      height ? parseFloat(height) : null,
      weight ? parseFloat(weight) : null,
      has_battery === '1' || has_battery === 'true' ? 1 : 0,
      image_url_1,
      image_url_2,
      image_url_3,
      id
    ];
    
    await db.query(sql, params);
    
    res.json({
      message: '竞品更新成功',
      id: id,
      data: {
        id: id,
        product_name,
        brand,
        country_code: country_code.toUpperCase(),
        sale_price: parseFloat(sale_price),
        length: length ? parseFloat(length) : null,
        width: width ? parseFloat(width) : null,
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        has_battery: has_battery === '1' || has_battery === 'true',
        image_url_1,
        image_url_2,
        image_url_3
      }
    });
  } catch (error) {
    console.error('更新竞品错误:', error);
    res.status(500).json({
      error: '更新竞品失败',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;