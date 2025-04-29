CREATE TABLE kanban (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '唯一主键',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建日期（自动记录插入时间）',
    content TEXT NOT NULL COMMENT '信息内容（长文本支持）',
    urgency_level ENUM('h', 'm', 'l') NOT NULL DEFAULT 'm' COMMENT '紧急程度',
    valid_until DATE NOT NULL COMMENT '有效期（YYYY-MM-DD格式）',
    notes VARCHAR(500) COMMENT '备注（可选字段）'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='看板信息表';