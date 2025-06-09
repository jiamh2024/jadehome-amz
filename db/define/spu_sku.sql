CREATE TABLE `spu_sku` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `spu_id` int(10) unsigned NOT NULL COMMENT '关联的SPU ID',
  `sku_id` int(10) unsigned NOT NULL COMMENT '关联的SKU ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_spu_sku` (`spu_id`, `sku_id`), -- 保证一个SPU和SKU的组合唯一
  KEY `idx_spu_id` (`spu_id`),
  KEY `idx_sku_id` (`sku_id`),
  CONSTRAINT `fk_spu_sku_spu` FOREIGN KEY (`spu_id`) REFERENCES `product_spu`(`spu_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_spu_sku_sku` FOREIGN KEY (`sku_id`) REFERENCES `product_sku`(`sku_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SPU与SKU对应表';