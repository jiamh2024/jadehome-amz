--
-- 产品SKU表结构
--
DROP TABLE IF EXISTS `product_sku`;
CREATE TABLE `product_sku` (
  `sku_id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'SKU唯一标识ID',
  `sku_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SKU编码(如:PROD001-BL-S)',
  `father_sku_code` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '父级SKU编码(用于产品变体关系)',
  `product_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '产品名称',
  `length` decimal(10,2) unsigned NOT NULL COMMENT '长度(厘米)',
  `width` decimal(10,2) unsigned NOT NULL COMMENT '宽度(厘米)',
  `height` decimal(10,2) unsigned NOT NULL COMMENT '高度(厘米)',
  `volume` decimal(12,2) GENERATED ALWAYS AS (((`length` * `width`) * `height`)) VIRTUAL COMMENT '体积(cm³)',
  `weight` decimal(12,3) unsigned NOT NULL COMMENT '重量(千克)',
  `has_battery` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否含电池(0-否 1-是)',
  `battery_type` enum('Lithium','Lead-acid','None') COLLATE utf8mb4_unicode_ci DEFAULT 'None' COMMENT '电池类型',
  `purchase_cost` decimal(15,2) unsigned NOT NULL COMMENT '采购成本(含税)',
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CNY' COMMENT '货币代码(ISO标准)',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '启用状态(0-停用 1-启用)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`sku_id`),
  UNIQUE KEY `sku_code` (`sku_code`),
  KEY `idx_sku_code` (`sku_code`),
  KEY `idx_father_sku` (`father_sku_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品SKU明细表(含父子SKU关系)';

ALTER TABLE product_sku ADD COLUMN asin VARCHAR(10) AFTER currency;