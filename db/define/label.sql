-- 创建标签模板表
drop table if exists label_template;
create table label_template (
  id int primary key auto_increment,
  length int not null comment '标签长度',
  width int not null comment '标签宽度',
  logo_path varchar(255) comment '商标图案路径',
  email varchar(100) comment '电子邮箱',
  website varchar(255) comment '网址',
  qr_code_link varchar(255) comment '二维码图案链接',
  scan_icon_link varchar(255) comment '扫码图标链接',
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp on update current_timestamp
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建SKU与标签模板关联表
drop table if exists sku_label;
create table sku_label (
  id int primary key auto_increment,
  sku_code varchar(100) not null comment 'SKU编码',
  label_id int not null comment '标签模板ID',
  country_code char(2) not null comment '国家代码',
  fnsku varchar(100) not null comment 'FNSKU编号',
  title varchar(255) not null comment '标签标题模板',
  left_text text comment '左侧文字信息',
  production_date date comment '生产日期',
  created_at timestamp default current_timestamp,
  foreign key (label_id) references label_template(id),
  foreign key (country_code) references country(country_code),
  unique key uk_sku_label_country (sku_code, label_id, country_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;