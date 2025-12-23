--
-- BOM表结构
--
DROP TABLE IF EXISTS `bom`;
CREATE TABLE `bom` (
  `bom_id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'BOM唯一标识ID',
  `sku_id` int(10) unsigned NOT NULL COMMENT '产品SKU ID',
  `component_id` int(10) unsigned NOT NULL COMMENT '零部件ID',
  `quantity` decimal(10,3) unsigned NOT NULL DEFAULT '1.000' COMMENT '所需数量',
  `unit` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pcs' COMMENT '单位',
  `usage_note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '使用说明',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '启用状态(0-停用 1-启用)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`bom_id`),
  UNIQUE KEY `uk_sku_component` (`sku_id`,`component_id`),
  KEY `idx_sku_id` (`sku_id`),
  KEY `idx_component_id` (`component_id`),
  CONSTRAINT `fk_bom_sku` FOREIGN KEY (`sku_id`) REFERENCES `product_sku` (`sku_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bom_component` FOREIGN KEY (`component_id`) REFERENCES `component` (`component_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品BOM表(产品与零部件的关系表)';
