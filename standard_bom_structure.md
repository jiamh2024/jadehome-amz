# 标准BOM数据结构参考

## 1. BOM主表 (bom_main)
主要存储BOM的基本信息和版本管理

```sql
CREATE TABLE `bom_main` (
  `bom_id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'BOM唯一标识ID',
  `bom_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'BOM编码',
  `sku_id` int(10) unsigned NOT NULL COMMENT '产品SKU ID',
  `bom_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'BOM名称',
  `bom_version` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'V1.0' COMMENT 'BOM版本',
  `revision` int(10) unsigned NOT NULL DEFAULT '1' COMMENT '修订次数',
  `status` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'BOM状态(0-停用 1-启用 2-草稿 3-审核中)',
  `effective_date` date DEFAULT NULL COMMENT '生效日期',
  `expiry_date` date DEFAULT NULL COMMENT '失效日期',
  `total_cost` decimal(15,4) unsigned DEFAULT NULL COMMENT 'BOM总成本',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'BOM描述',
  `created_by` int(10) unsigned DEFAULT NULL COMMENT '创建人',
  `updated_by` int(10) unsigned DEFAULT NULL COMMENT '更新人',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`bom_id`),
  UNIQUE KEY `uk_bom_code_version` (`bom_code`,`bom_version`),
  KEY `idx_sku_id` (`sku_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_bom_main_sku` FOREIGN KEY (`sku_id`) REFERENCES `product_sku` (`sku_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BOM主表';
```

## 2. BOM子项表 (bom_item)
存储BOM的具体组成物料信息

```sql
CREATE TABLE `bom_item` (
  `bom_item_id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'BOM子项ID',
  `bom_id` int(10) unsigned NOT NULL COMMENT '所属BOM ID',
  `parent_item_id` int(10) unsigned DEFAULT NULL COMMENT '父项ID(用于多级BOM)',
  `component_id` int(10) unsigned NOT NULL COMMENT '零部件ID',
  `quantity` decimal(12,4) unsigned NOT NULL DEFAULT '1.0000' COMMENT '所需数量',
  `unit` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pcs' COMMENT '单位',
  `bom_level` tinyint(1) unsigned NOT NULL DEFAULT '1' COMMENT 'BOM层级(1-顶层 2-第二层...)',
  `scrap_rate` decimal(5,2) unsigned DEFAULT '0.00' COMMENT '损耗率(%)',
  `usage_note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '使用说明',
  `sequence` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '排序顺序',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '启用状态(0-停用 1-启用)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`bom_item_id`),
  KEY `idx_bom_id` (`bom_id`),
  KEY `idx_component_id` (`component_id`),
  KEY `idx_parent_item_id` (`parent_item_id`),
  CONSTRAINT `fk_bom_item_bom` FOREIGN KEY (`bom_id`) REFERENCES `bom_main` (`bom_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bom_item_component` FOREIGN KEY (`component_id`) REFERENCES `component` (`component_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bom_item_parent` FOREIGN KEY (`parent_item_id`) REFERENCES `bom_item` (`bom_item_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BOM子项表';
```

## 3. BOM替代物料表 (bom_alternative)
存储物料的替代方案

```sql
CREATE TABLE `bom_alternative` (
  `alt_id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '替代ID',
  `bom_item_id` int(10) unsigned NOT NULL COMMENT 'BOM子项ID',
  `alternative_component_id` int(10) unsigned NOT NULL COMMENT '替代零部件ID',
  `alternative_quantity` decimal(12,4) unsigned NOT NULL DEFAULT '1.0000' COMMENT '替代数量',
  `priority` tinyint(1) unsigned NOT NULL DEFAULT '1' COMMENT '优先级(1-最高)',
  `alt_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '替代原因',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '启用状态(0-停用 1-启用)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`alt_id`),
  KEY `idx_bom_item_id` (`bom_item_id`),
  KEY `idx_alternative_component_id` (`alternative_component_id`),
  CONSTRAINT `fk_bom_alternative_item` FOREIGN KEY (`bom_item_id`) REFERENCES `bom_item` (`bom_item_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bom_alternative_component` FOREIGN KEY (`alternative_component_id`) REFERENCES `component` (`component_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BOM替代物料表';
```

## 4. BOM变更历史表 (bom_change_history)
记录BOM的变更历史

```sql
CREATE TABLE `bom_change_history` (
  `history_id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '历史记录ID',
  `bom_id` int(10) unsigned NOT NULL COMMENT 'BOM ID',
  `change_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '变更类型(CREATE/UPDATE/DELETE/REVISION)',
  `change_content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '变更内容(JSON格式)',
  `old_value` text COLLATE utf8mb4_unicode_ci COMMENT '变更前值(JSON格式)',
  `new_value` text COLLATE utf8mb4_unicode_ci COMMENT '变更后值(JSON格式)',
  `changed_by` int(10) unsigned DEFAULT NULL COMMENT '变更人',
  `changed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '变更时间',
  PRIMARY KEY (`history_id`),
  KEY `idx_bom_id` (`bom_id`),
  KEY `idx_change_type` (`change_type`),
  KEY `idx_changed_at` (`changed_at`),
  CONSTRAINT `fk_bom_history_bom` FOREIGN KEY (`bom_id`) REFERENCES `bom_main` (`bom_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='BOM变更历史表';
```

## 5. BOM与产品关系表 (可选) (product_bom)
管理一个产品的多个BOM版本

```sql
CREATE TABLE `product_bom` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `sku_id` int(10) unsigned NOT NULL COMMENT '产品SKU ID',
  `bom_id` int(10) unsigned NOT NULL COMMENT 'BOM ID',
  `is_default` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否默认BOM(0-否 1-是)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sku_bom` (`sku_id`,`bom_id`),
  CONSTRAINT `fk_product_bom_sku` FOREIGN KEY (`sku_id`) REFERENCES `product_sku` (`sku_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_product_bom_bom` FOREIGN KEY (`bom_id`) REFERENCES `bom_main` (`bom_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品BOM关系表';
```

## 数据结构说明

### 1. 核心设计特点

- **版本管理**: 通过bom_version和revision字段实现BOM版本控制
- **状态管理**: 支持草稿、审核中、启用、停用等多种状态
- **生效日期控制**: 支持设置BOM的生效和失效日期
- **多级BOM支持**: 通过parent_item_id字段支持多级BOM结构
- **替代物料管理**: 支持为每个物料项设置多个替代物料
- **变更历史追踪**: 完整记录BOM的所有变更操作
- **成本管理**: 支持BOM总成本计算

### 2. 与现有系统的关联

- **产品SKU**: 通过sku_id关联到product_sku表
- **零部件**: 通过component_id关联到component表
- **用户管理**: 通过created_by和updated_by关联到用户表(如果有)

### 3. 扩展功能

- **工序BOM**: 可添加bom_operation表关联到生产工序
- **配置BOM**: 支持产品配置与BOM的动态关联
- **成本核算**: 与财务系统集成，自动计算BOM成本
- **库存关联**: 与库存系统集成，支持物料需求计划(MRP)

### 4. 使用建议

1. **单级与多级BOM**: 根据产品复杂度选择合适的BOM层级结构
2. **版本控制**: 每次修改BOM时创建新版本，保留历史版本
3. **审批流程**: 建立BOM的审核流程，确保数据准确性
4. **替代物料**: 为关键物料设置替代方案，提高供应链弹性
5. **成本更新**: 定期更新BOM成本，确保成本数据准确性

这个标准BOM数据结构可以根据实际业务需求进行调整和扩展，以满足不同行业和企业的BOM管理需求。