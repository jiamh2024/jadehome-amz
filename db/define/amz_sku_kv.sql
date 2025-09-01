CREATE TABLE amz_pd_kv (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku_code VARCHAR(50) NOT NULL COMMENT '产品SKU编码',
    country_code CHAR(2) NOT NULL COMMENT '国家编码，ISO 2字母代码',
    spec_key VARCHAR(100) NOT NULL COMMENT '规格键名',
    spec_value TEXT COMMENT '规格值',
    sort_order INT DEFAULT 0 COMMENT '排序顺序，由用户指定，数值越小越靠前',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 添加唯一约束，确保同一产品的同一规格在一个国家下唯一
    UNIQUE KEY amz_product_spec (sku_code, country_code, spec_key),
    INDEX (sku_code),
    INDEX (country_code),
    INDEX (sort_order)  -- 为排序字段添加索引以提高排序查询性能
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='产品规格键值表';

ALTER TABLE amz_pd_kv 
ADD COLUMN sort_order INT DEFAULT 0 COMMENT '排序顺序，由用户指定，数值越小越靠前',
ADD INDEX (sort_order);

ALTER TABLE amz_pd_kv
MODIFY COLUMN spec_key VARCHAR(512) NOT NULL COMMENT '规格键名';
