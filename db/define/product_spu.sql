CREATE TABLE `product_spu` (
  `spu_id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'SPU唯一标识ID',
  `spu_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SPU名称（商品通用名称）',
  `category_id` varchar(20) NOT NULL COMMENT '商品分类ID',
  `brand_id` varchar(20) DEFAULT NULL COMMENT '品牌ID',
  `variant_attributes` varchar(32) DEFAULT NULL COMMENT '变体属性集合（如颜色、尺寸等，以逗号分隔）',
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '商品描述',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT '状态（0-下架，1-上架）',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`spu_id`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_brand_id` (`brand_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品SPU表';