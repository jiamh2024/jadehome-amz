CREATE TABLE product_cp (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL COMMENT 'Product specification/name',
    brand VARCHAR(100) NOT NULL,
    country_code CHAR(2) NOT NULL COMMENT '2-letter country abbreviation where product is sold',
    sale_price DECIMAL(10, 2) NOT NULL COMMENT 'Selling price in local currency',
    length DECIMAL(6, 2) COMMENT 'Product length in local',
    width DECIMAL(6, 2) COMMENT 'Product width in local',
    height DECIMAL(6, 2) COMMENT 'Product height in local',
    weight DECIMAL(6, 3) COMMENT 'Product weight in local',
    has_battery TINYINT(1) DEFAULT 0 COMMENT '0 = No battery, 1 = Contains battery',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (brand),
    INDEX (country_code),
    INDEX (product_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Competitor product information for market analysis';