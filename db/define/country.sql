CREATE TABLE country (
    id INT AUTO_INCREMENT PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL,
    country_code CHAR(2) NOT NULL COMMENT '2-letter country abbreviation',
    currency_unit VARCHAR(50) NOT NULL COMMENT 'Local currency name',
    currency_code CHAR(3) NOT NULL COMMENT '3-letter currency code',
    exchange_rate_to_cny DECIMAL(10, 4) NOT NULL COMMENT 'Exchange rate to Chinese Yuan',
    vat_rate DECIMAL(5, 2) NOT NULL COMMENT 'Value Added Tax rate in percentage',
    amz_commission_rate DECIMAL(5, 2) NOT NULL COMMENT 'Amazon commission rate in percentage',
    shipping_cost DECIMAL(10, 2) COMMENT 'Sea shipping cost in local currency',
    local_delivery_rules TEXT COMMENT 'Rules for local delivery fees',
    length_unit VARCHAR(10) NOT NULL DEFAULT 'cm' COMMENT 'Length unit (cm/inch)',
    weight_unit VARCHAR(10) NOT NULL DEFAULT 'kg' COMMENT 'Weight unit (kg/lb)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY (country_code),
    UNIQUE KEY (country_name),
    KEY `idx_country_code` (`country_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Country information including economic and shipping data';