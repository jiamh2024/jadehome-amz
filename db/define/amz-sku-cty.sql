CREATE TABLE amz_sku_cty (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku_id INT(10) unsigned NOT NULL COMMENT 'SKU唯一标识ID，关联product_sku表',
    country_id INT NOT NULL COMMENT '国家ID，关联country表',
    country_sku VARCHAR(100) NOT NULL COMMENT '国家特定SKU编码',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 添加唯一约束，确保同一个SKU在同一个国家下只有一个国家SKU
    UNIQUE KEY unique_sku_country (sku_id, country_id),
    -- 添加外键约束，关联product_sku表
    FOREIGN KEY (sku_id) REFERENCES product_sku(sku_id) ON DELETE CASCADE ON UPDATE CASCADE,
    -- 添加外键约束，关联country表
    FOREIGN KEY (country_id) REFERENCES country(id) ON DELETE CASCADE ON UPDATE CASCADE,
    -- 添加索引以提高查询性能
    INDEX idx_sku_id (sku_id),
    INDEX idx_country_id (country_id),
    INDEX idx_country_sku (country_sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Amazon国家特定SKU表，用于存储不同国家的SKU对应关系';