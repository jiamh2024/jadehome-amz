CREATE TABLE amz_pd_kv (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku_code VARCHAR(50) NOT NULL COMMENT '产品SKU编码',
    country_code CHAR(2) NOT NULL COMMENT '国家编码，ISO 2字母代码',
    spec_key VARCHAR(100) NOT NULL COMMENT '规格键名',
    spec_value TEXT COMMENT '规格值',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 添加唯一约束，确保同一产品的同一规格在一个国家下唯一
    UNIQUE KEY amz_product_spec (sku_code, country_code, spec_key),
    INDEX (sku_code),
    INDEX (country_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品规格键值表';

