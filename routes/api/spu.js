const express = require('express');
const router = express.Router();
const connection = require('../../db/db.js');

// 获取所有 product_spu 记录（GET 请求）
router.get('/', (req, res) => {
    const query = 'SELECT * FROM product_spu';
    connection.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error fetching product_spu records' });
        } else {
            res.json(results);
        }
    });
});

// 创建新的 product_spu 记录（POST 请求）
router.post('/', (req, res) => {
  try {  
    const { spu_name, category_id, brand_id, variant_attributes, description, status } = req.body;
    const query = 'INSERT INTO product_spu (spu_name, category_id, brand_id, variant_attributes, description, status) VALUES (?,?,?,?,?,?)';
    const values = [spu_name, category_id, brand_id, variant_attributes, description, status];
    const results = connection.query(query, values);
    res.status(201).json({
      success: true,
      data: { spu_id: results.insertId }
    });

  } catch (error) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'SKU code already exists'
      });
    }
    handleServerError(res, err);
  }

});

// 获取单个 product_spu 记录（GET 请求，带参数）
router.get('/:id', async(req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM product_spu WHERE spu_id =?';
    results = await connection.query(query, [id]);
    res.json(results[0]);
    console.log(`Fetched product_spu with ID ${id}:`, results);

  } catch (err) {
    console.error(`Error fetching product_spu with ID ${id}:`, err);
    res.status(500).json({ error: 'Error fetching product_spu record' });
  }   
});

// 更新指定 product_spu 记录（PUT 请求，带参数）
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { spu_name, category_id, brand_id, variant_attributes, description, status } = req.body;
    const query = 'UPDATE product_spu SET spu_name =?, category_id =?, brand_id =?, variant_attributes =?, description =?, status =? WHERE spu_id =?';
    const values = [spu_name, category_id, brand_id, variant_attributes, description, status, id];
    connection.query(query, values, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error updating product_spu record' });
        } else if (results.affectedRows === 0) {
            res.status(404).json({ error: 'Product SPU not found' });
        } else {
            res.json({ message: 'Product SPU updated successfully' });
        }
    });
});

// 删除指定 product_spu 记录（DELETE 请求，带参数）
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM product_spu WHERE spu_id =?';
    connection.query(query, [id], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Error deleting product_spu record' });
        } else if (results.affectedRows === 0) {
            res.status(404).json({ error: 'Product SPU not found' });
        } else {
            res.json({ message: 'Product SPU deleted successfully' });
        }
    });
});

// 获取指定SPU的所有SKU
router.get('/:spuId/skus', async (req, res) => {
  const spuId = req.params.spuId;
  
  try {
    // 假设spu_sku表有spu_id和sku_id字段
    const query = `
      SELECT s.* 
      FROM product_sku s
      JOIN spu_sku ss ON s.sku_id = ss.sku_id
      WHERE ss.spu_id = ?
    `;
    const rows = await connection.query(query, [spuId]);
    res.json(rows);
  } catch (error) {
    console.error(`Error fetching SKUs for SPU ${spuId}:`, error);
    res.status(500).json({ error: `Failed to fetch SKUs for SPU ${spuId}` });
  }
});
// 添加SKU到SPU
router.post('/:spuId/skus', async (req, res) => {
  const spuId = req.params.spuId;
  const { sku_id } = req.body;
  
  if (!sku_id) {
    return res.status(400).json({ error: 'SKU ID is required' });
  }

  try {
    // 检查关系是否已存在
    const checkQuery = 'SELECT * FROM spu_sku WHERE spu_id = ? AND sku_id = ?';
    const records = await connection.query(checkQuery, [spuId, sku_id]);

    if (records.length > 0) {
      return res.status(400).json({ error: 'SKU already associated with this SPU' });
    }

    // 添加关系
    const insertQuery = 'INSERT INTO spu_sku (spu_id, sku_id) VALUES (?, ?)';
    await connection.query(insertQuery, [spuId, sku_id]);
    
    res.status(201).json({ message: 'SKU added to SPU successfully' });
  } catch (error) {
    console.error(`Error adding SKU ${sku_id} to SPU ${spuId}:`, error);
    res.status(500).json({ error: `Failed to add SKU to SPU` });
  }
});

// 从SPU删除SKU
router.delete('/:spuId/skus/:skuId', async (req, res) => {
  const spuId = req.params.spuId;
  const skuId = req.params.skuId;
  
  try {
    // 删除关系
    const deleteQuery = 'DELETE FROM spu_sku WHERE spu_id = ? AND sku_id = ?';
    const result = await connection.query(deleteQuery, [spuId, skuId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'SKU not found in this SPU' });
    }
    
    res.json({ message: 'SKU removed from SPU successfully' });
  } catch (error) {
    console.error(`Error removing SKU ${skuId} from SPU ${spuId}:`, error);
    res.status(500).json({ error: `Failed to remove SKU from SPU` });
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