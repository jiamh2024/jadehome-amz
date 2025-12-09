--
-- 零部件表结构
--
DROP TABLE IF EXISTS `component`;
CREATE TABLE `component` (
  `component_id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '零部件唯一标识ID',
  `sku_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '零部件SKU编码',
  `supplier` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '供应商',
  `supplier_impression` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '供应商印象',
  `core_specs` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '核心规格描述',
  `features_usage` text COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '特点及用法',
  `purchase_price` decimal(15,2) unsigned NOT NULL COMMENT '采购价格',
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CNY' COMMENT '货币代码',
  `weight` decimal(12,3) unsigned NOT NULL COMMENT '重量(千克)',
  `inventory_quantity` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '库存数量',
  `length` decimal(10,2) unsigned NOT NULL COMMENT '长度(厘米)',
  `width` decimal(10,2) unsigned NOT NULL COMMENT '宽度(厘米)',
  `height` decimal(10,2) unsigned NOT NULL COMMENT '高度(厘米)',
  `volume` decimal(12,2) GENERATED ALWAYS AS (((`length` * `width`) * `height`)) VIRTUAL COMMENT '体积(cm³)',
  `remarks` text COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '启用状态(0-停用 1-启用)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`component_id`),
  UNIQUE KEY `sku_code` (`sku_code`),
  KEY `idx_sku_code` (`sku_code`),
  KEY `idx_supplier` (`supplier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='零部件管理表';
