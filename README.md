# Jadehome AMZ

这是一个面向 Amazon 运营工作的内部管理系统，基于 Node.js + Express + Pug 构建，主要用于商品、库存、国家/市场、促销活动、广告、订单和标签的管理与数据查询。

从代码结构看，它更像是一个“Amazon 商务运营后台”，不是纯粹的通用 Web 应用。它结合了 MySQL 数据库、Redis 缓存，以及 Amazon SP-API / Amazon Ads API 的接入，用于连接 Amazon 的产品、订单、广告和市场数据。

---

## 一、项目定位

该项目主要解决以下几类问题：

- SKU / SPU / 产品主数据管理
- 国家、站点、市场配置管理
- 看板信息和运营任务管理
- 订单数据查询与处理
- Amazon 广告活动和预算查询
- 标签 / 条码生成
- 成本与利润分析
- 组件/物料和库存信息管理

从路由命名可以看到，核心功能模块覆盖了：

- `sku`：SKU 相关
- `spu`：SPU 相关
- `kanban`：看板
- `country`：国家/站点
- `cp`：成本/价格/产品信息模块
- `label`：标签与条码
- `profit`：利润分析
- `amz`：Amazon 相关功能
- `campaigns`：广告活动

---

## 二、技术栈

- 运行时：Node.js
- Web 框架：Express 4.x
- 模板引擎：Pug
- 数据库：MySQL (`mysql2`)
- 缓存：Redis
- API：Amazon Selling Partner API、Amazon Ads API
- 解析/导出：`xlsx`, `jsbarcode`
- 其他：`multer`、`axios`、`express-validator`

---

## 三、项目结构说明

```text
jadehome-amz/
├── app.js                  # Express 主应用入口
├── bin/
│   └── www                 # HTTPS 启动入口，读取证书与端口
├── db/
│   ├── db.js               # MySQL 连接池
│   ├── redis.js            # Redis 缓存
│   └── define/             # SQL 建表脚本
├── routes/                 # Web 页面路由和 API 路由
│   ├── api/                # JSON 接口
│   ├── ads-api/            # Amazon Ads API 接口
│   ├── sp-api/             # Amazon SP-API
│   └── *.js                # 页面路由
├── views/                  # Pug 模板
├── public/                 # 静态资源（CSS/JS/图片）
├── validators/             # 表单校验
├── funcs/                 # 业务函数
├── package.json            # 依赖和启动脚本
├── ecosystem.config.js     # pm2 配置示例
├── inventory-debug.json    # 调试数据
└── README.md
```

---

## 四、核心功能模块

### 1. SKU / SPU 管理

主要页面和 API：

- `/skuadd`
- `/skuls`
- `/spuadd`
- `/spuls`
- `/spusku`
- `/api/sku`
- `/api/spu`

这些路由对应产品信息维护，适合商品主数据录入、查询和更新。

### 2. 国家/市场配置

- `/cntyadd`
- `/cntyls`
- `/api/country`

用于管理 Amazon 不同市场国家数据，如美国、加拿大、英国、阿联酋、沙特等。

### 3. 广告 API 集成

- `/signin`
- `/campaigns`
- `/api/adsapi`

实际代码中已接入 Amazon Advertising API，能够拉取广告活动、预算、Profile 等信息，并通过 Redis 缓存 token / profile 列表。

### 4. Amazon SP-API 集成

- `/amzorder`
- `/amzsku`
- `/api/amzapi`

用于访问 Amazon Selling Partner API，进行订单查询及相关市场数据获取。

### 5. 标签与条码

- `/label`
- `/sku-label`
- `/api/label`
- `/api/sku-label`

支持标签生成和 SKU 相关标签内容输出，结合 `jsbarcode` 可用于条形码场景。

### 6. 成本 / 利润分析

- `/profit`
- `/vcal`

适合做采购成本、销售利润、毛利等运营数据分析。

### 7. 看板与任务管理

- `/kbadd`
- `/kbls`
- `/api/kanban`

用于内部看板任务流转和运营事项管理。

---

## 五、启动方式

### 1. 安装依赖

```bash
npm install
```

### 2. 准备数据库

项目依赖 MySQL，并且 SQL 建表脚本位于：

```text
db/define/
```

如：

- `amz_sku_kv.sql`
- `amz-sku-cty.sql`
- `component.sql`
- `country.sql`
- `kanban.sql`
- `label.sql`
- `product_cp.sql`
- `product_sku.sql`
- `product_spu.sql`
- `spu_sku.sql`

注意：当前代码中的 MySQL 连接信息在 `db/db.js` 中是硬编码的：

```js
host: process.env.DB_HOST,
user: "jia",
password: "123",
database: "jdb",
```

在真实使用前，建议改为环境变量或正式配置，以避免密码泄露。

### 3. 使用 `.env` 管理环境变量

推荐将所有配置统一放到项目根目录的 `.env` 文件中，然后由 `dotenv` 自动加载。

复制模板：

```bash
cp .env.example .env
```

然后编辑 `.env`，按实际环境填写值。

示例变量如下：

```bash
PORT=3000
PRIVATE_KEY=./certs/private.key
CERTIFICATE=./certs/certificate.crt

DB_HOST=127.0.0.1
DB_USER=jia
DB_PASSWORD=123
DB_NAME=jdb
DB_PORT=3306

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=123
REDIS_DB=0

SP_API_CLIENT_ID=your_client_id
SP_API_CLIENT_SECRET=your_client_secret
SP_API_USER_AGENT=Jadehome-AMZ/1.0
SP_API_EP_NA=https://sellingpartnerapi-na.amazon.com
SP_API_EP_EU=https://sellingpartnerapi-eu.amazon.com
SP_API_REFRESH_TOKEN_NA=your_na_refresh_token
SP_API_REFRESH_TOKEN_EU=your_eu_refresh_token
SP_API_REFRESH_TOKEN_AE=your_ae_refresh_token
SP_API_REFRESH_TOKEN_SA=your_sa_refresh_token

AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

ADS_API_CLIENT_ID=your_ads_client_id
```

> 代码中已通过 `require('dotenv').config()` 加载 `.env`，因此不再需要手动 `export` 每个变量。

### 4. 准备 Redis

本项目使用 Redis 来缓存 Amazon API 的 token / profile 等信息，确保能在 `db/redis.js` 中连接到 Redis。

### 5. 配置 Amazon / HTTPS 环境变量

启动入口 `bin/www` 读取的变量现在是 `.env` 中的对应值，配置项与上面一致。

其中：

- `PRIVATE_KEY` / `CERTIFICATE`：用于 HTTPS 启动
- `SP_API_*`：Amazon Selling Partner API 所需参数
- `ADS_API_CLIENT_ID`：Amazon Advertising API client id
- `AWS_*`：如果调用 AWS 签名接口时使用

> 这是项目真正运行所需的关键配置。没有这些信息，应用无法完成真实的 Amazon API 调用。

### 5. 启动程序

```bash
npm start
```

默认监听端口：`3000`

启动入口会用 HTTPS 模式创建服务，因此实际访问需使用 HTTPS 证书。若没有证书，需先准备本地证书或改为 HTTP 制式。

---

## 六、常用访问入口

应用启动后，常用页面入口包括：

- 首页：`/`
- 看板列表：`/kbls`
- SKU 新增：`/skuadd`
- SKU 列表：`/skuls`
- SPU 列表：`/spuls`
- 国家新增：`/cntyadd`
- 国家列表：`/cntyls`
- 产品/CP 管理：`/cpls`
- 利润分析：`/profit`
- 标签页：`/label`
- Amazon 订单：`/amzorder`
- 广告活动：`/campaigns`

API 入口：

- `/api/sku`
- `/api/spu`
- `/api/kanban`
- `/api/country`
- `/api/cp`
- `/api/label`
- `/api/sku-label`
- `/api/component`
- `/api/amzapi`
- `/api/adsapi`

---

## 七、业务流程建议

一个比较合理的使用顺序是：

1. 准备 MySQL + Redis
2. 导入 `db/define` 中的建表 SQL
3. 配置 Amazon Market / Ads 凭证
4. 在后台维护国家和站点信息
5. 新增 SKU / SPU / 产品资料
6. 生成标签和条码
7. 查询订单与广告活动数据
8. 结合利润分析做运营决策

---

## 八、已知实现细节与注意事项

### 1. 这是内部运营工具

从代码和命名看，这是企业内部或个人运营系统，不是通用开源项目。它偏重：

- 业务流程管理
- Amazon 运营数据
- 内部后台操作
- 站点与市场配置

### 2. 安全方面需要注意

当前代码有一些“开发环境”痕迹：

- 数据库密码直接写在代码中
- `bin/www` 依赖本地证书文件
- 真实访问令牌/刷新令牌依赖环境变量
- 没有明显的统一权限认证中间件

如果要用于正式环境，建议补齐：

- `.env` 文件管理
- 密钥分离
- 权限控制
- 日志审计
- HTTPS 证书和域名配置

### 3. 当前项目比较偏“脚本式管理后台”

代码模块多，但结构仍然偏传统 Express 方式，适合内部快速迭代，不是现代微服务或前后端分离式架构。

---

## 九、常见问题

### Q: 启动报错：找不到 `PRIVATE_KEY` 或 `CERTIFICATE`

答案：在 `bin/www` 中，启动过程直接读取：

```js
process.env.PRIVATE_KEY
process.env.CERTIFICATE
```

请先设置它们，或者准备证书文件后再启动。

### Q: 数据库连接失败

答案：检查：

- MySQL 是否已启动
- `DB_HOST` 是否配置正确
- `db/db.js` 中的账号密码和数据库名是否匹配

### Q: Amazon API 调用失败

答案：检查：

- `SP_API_CLIENT_ID`
- `SP_API_CLIENT_SECRET`
- `SP_API_REFRESH_TOKEN_*`
- `ADS_API_CLIENT_ID`
- Amazon 账号权限是否正常

### Q: Redis 错误

答案：确保 Redis 服务已启动，并且配置能够连通。

---

## 十、建议的改进方向

如果该项目要长期维护，建议采取以下改进：

1. 把数据库配置移出代码，改为 `.env` 管理
2. 把历史页面路由整理成更清晰的模块结构
3. 增加统一鉴权中间件
4. 把 API 与页面逻辑分离，减少耦合
5. 统一错误处理和日志
6. 补充测试覆盖，特别是 API 和数据导入逻辑
7. 如果用于生产，增加审计和权限控制

---

## 十一、总结

这个项目本质上是一个偏业务型的 Amazon 运营后台，核心价值在于：

- 统一维护 Amazon 相关主数据
- 整合 Sp API / Ads API 数据源
- 支持运营工作流
- 便于商品、订单、广告与利润分析

它适合用于内部团队的日常 Amazon 运营管理，但在正式上线前，需要补全环境变量管理、安全加固和部署配置。

如果你希望，我还可以继续帮你做两件事中的任意一个：

1. 按这个项目再补一版更详细的“开发者部署手册”
2. 直接整理一份适合生产环境的 `.env.example` 和启动脚本
