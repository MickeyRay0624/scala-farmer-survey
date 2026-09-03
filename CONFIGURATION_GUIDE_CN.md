# SCALA 问卷：Google Sheet 无代码维护指南

更新日期：2026-09-03
配置版本：`2026-09-03-v2`

## 1. 整体结构

系统分成三个彼此隔离的层次：

1. **GitHub Pages 问卷网页**：农户或调查员在手机、平板和电脑上填写；
2. **Google Form 接收器**：只负责接收网页提交的数据；
3. **Google Sheet 管理与分析表**：保存原始响应、维护问卷配置，并自动把 JSON 展开成分析表。

测试环境和正式环境必须各有一套独立的 Google Form 与 Google Sheet。测试数据不得进入正式响应表。

## 2. 第一次建立测试环境

项目提供了 `SCALA_Farmer_Survey_TEST_Manager.xlsx`。将它导入 Google Drive 并转换为原生 Google Sheet 后：

1. 保持整个工作簿为私有文件；不要把包含农户回答的工作簿“发布到网络”；
2. 打开 **扩展程序 → Apps Script**；
3. 将 `google-apps-script/Code.gs` 和 `google-apps-script/appsscript.json` 放入该工作簿的 Apps Script 项目；
4. 如果 Google 将脚本打开为独立项目，在 **项目设置 → 脚本属性** 新增 `SCALA_SPREADSHEET_ID`，值为这个测试 Google Sheet 网址中 `/d/` 与 `/edit` 之间的 ID。绑定到 Sheet 的脚本可跳过此步；
5. 运行一次 `bootstrapTestEnvironment()` 并完成 Google 授权；
6. 脚本会新建一个名称带 `[TEST]` 的独立 Google Form、把它连接到当前工作簿，并安装表单提交触发器；
7. 先检查测试表单，再运行 `publishTestForm()`；发布函数会自动把 `Transport_Map` 中的临时问题 ID 替换为 Google Forms 真正接收提交的 `entry.*` ID；
8. 将 Apps Script 部署为 Web App。它只返回下列配置表，不返回任何原始回答或分析数据：
   - `Settings`
   - `Sections`
   - `Questions`
   - `Fields`
   - `Options`
   - `Logic`
   - `Transport_Map`
9. 将 Web App 地址写入 `Settings` 的 `config_url`，并连接到网页测试环境。

## 3. 非技术人员日常修改

### 3.1 修改题目文字或题目顺序

使用 `Questions` 工作表：

| 列 | 用途 | 是否建议修改 |
|---|---|---|
| `enabled` | `TRUE` 显示；`FALSE` 隐藏 | 是 |
| `block_id` | 网页内部稳定编号 | 否 |
| `section_id` | 所属大节 | 通常不改 |
| `segment_id` | 所属小节/版面分段 | 通常不改 |
| `order` | 同一小节内的显示顺序 | 是 |
| `question_text` | 题目文字 | 是 |
| `help_text` | 题目下方说明 | 是 |
| `editor_notes` | 给编辑人员的备注 | 可改 |

注意：`order` 在同一个 `segment_id` 内排序。大节顺序在 `Sections` 表修改。这样可以避免题目移动后脱离原来的小节标题和解释文字。

### 3.2 修改选项文字或选项顺序

使用 `Options` 工作表：

- 改显示文字：修改 `option_label`；
- 改选项顺序：修改 `option_order`；
- 暂时停用一个选项：把 `enabled` 改为 `FALSE`；
- `option_value` 是分析用的稳定值。正式收集开始后不要修改，否则同一含义可能在数据中出现两个编码；
- `exclusive=TRUE` 表示该选项与同组其他选项互斥，例如 None 或 Unknown；
- `opens_detail_id` 用于选择 Other 后打开说明框，通常不要修改。

### 3.3 修改跳题或显示逻辑

使用 `Logic` 工作表。一行逻辑的含义是：当 `source_question_id` 满足条件时，对 `target_id` 执行显示或隐藏。

常用 `operator`：

| 运算符 | 含义 | `expected_value` 示例 |
|---|---|---|
| `equals` | 唯一答案等于指定值 | `Yes` |
| `contains` | 多选答案包含指定值 | `Other` |
| `any_of` | 包含多个值中的任意一个 | `Regularly\|Occasionally` |
| `all_of` | 同时包含所有指定值 | `maize\|livestock` |
| `not_contains` | 不包含指定值 | `None` |
| `not_empty` | 已填写 | 留空即可 |
| `empty` | 未填写 | 留空即可 |
| `greater_than` | 数值大于 | `10` |
| `greater_or_equal` | 数值大于或等于 | `10` |

其他列：

- `target_type`：`element`、`block`、`question` 或 `section`；
- `effect`：`show` 或 `hide`；
- `join_mode`：同一目标有多行规则时用 `or` 或 `and` 合并；
- `clear_when_hidden=FALSE`：隐藏后仍保留本机草稿中的原答案，但不会提交；这是默认且更安全的设置；
- `clear_when_hidden=TRUE`：隐藏时立即清空答案，只有研究团队明确要求时才使用。

### 3.4 修改必答、输入范围或复合表格内标签

使用 `Fields` 工作表。这里有 709 个实际数据字段，属于高级编辑区：

- `required`：是否必答；
- `field_label`：地块表、品种表、量表行等内部标签；
- `placeholder`：输入框占位提示；
- `min_value` / `max_value` / `step_value`：数值输入限制；
- `analysis_type`：分析类型；
- `sensitive`：是否属于敏感信息提示字段。

不要修改已有字段的 `question_id`。它是网站、JSON 和分析表之间的主键。

## 4. 无代码新增标准题目

可以新增文本、长文本、数字、日期、单选、多选或下拉题：

1. 在 `Fields` 新增一行；
2. `question_id` 必须以 `custom.` 开头，例如 `custom.water_training_interest`；
3. 填写 `section_id`、`segment_id` 和 `order`；
4. `input_type` 使用 `text`、`textarea`、`number`、`date`、`radio`、`checkbox` 或 `select`；
5. `create_if_missing` 设为 `TRUE`；
6. 如果是选择题，在 `Options` 中用同一个 `question_id` 添加选项；
7. 如需跳题，在 `Logic` 添加规则。

新增的 `custom.*` 回答会写入测试 Form 的 `json_custom` 字段，并进入 `Responses_Wide`、`JSON_Long` 和 `Codebook`。

复杂的新组件（例如新的动态地块表、图片上传、签名、地图绘图）仍需要开发人员实现，因为它们不仅是一个普通题目。

## 5. 数据分析工作表

| 工作表 | 结构 | 适合用途 |
|---|---|---|
| 原始 `Form Responses...` | Google Forms 原始行 | 审计、恢复、核对提交 |
| `Responses_Wide` | 每份访谈一行，每个字段一列 | Excel/Sheets 筛选、统计、导出 CSV/SPSS/R |
| `JSON_Long` | 每个回答值一行 | 多选频数、数据质量检查、灵活透视表 |
| `Maize_Plots` | 每个玉米地块一行 | 面积、地形、地块类型分析 |
| `Livestock_Breeds` | 每个品种一行 | 品种来源与占比分析 |
| `Climate_Events` | 每个气候事件或年月一行 | 事件频数、强度和时间趋势 |
| `Losses` | 每次灾损一行 | 灾害年份、影响和金额分析 |
| `Support_Needs` | 每项措施、支持或约束一行 | 支持优先级和需求分析 |
| `Codebook` | 每个稳定字段一行 | 变量字典、共享给分析人员 |
| `Dashboard` | 汇总指标 | 快速检查响应和展开结果数量 |

新提交会通过安装式 Google Sheet 表单提交触发器自动展开。批量导入、改过字段结构或发现遗漏时，使用 **SCALA Tools → Rebuild all analysis** 重新生成。

如果在 Google Form 编辑器中增加、删除或重建了接收字段，先暂停收集，再运行 **SCALA Tools → 3 · Verify Google Form field mapping**。映射成功后脚本才会恢复原来的接收状态；映射失败时会保持暂停，避免产生只有时间戳的空回复。

## 6. 上线前测试清单

至少完成 10–20 个测试案例，其中包括：

- 仅玉米；
- 仅畜牧；
- 玉米 + 畜牧；
- Neither / not sure；
- 多个 Other 说明；
- 五条品种、灾损、支持记录均填写；
- A1/A2 多年份月份数据；
- 极长文本；
- 填写一部分后返回修改路由；
- 手机弱网、断网后恢复提交；
- 新增一个 `custom.*` 测试题；
- 修改一次选项标签和一次跳题规则。

核对内容：

1. 原始 Form 响应行存在；
2. `Responses_Wide` 中所有已填字段有值；
3. `JSON_Long` 的 `parse_status` 为 `OK`；
4. 专题表记录数量与网页填写数量一致；
5. 测试编号必须有 `[TEST]` 或 `QA-` 前缀；
6. 删除或明确排除测试数据后，才能切换到正式环境。

## 7. 安全边界

- 可以公开：GitHub Pages 问卷、经过审核的题目配置 Web App；
- 必须私有：原始响应表、展开后的分析表、Apps Script 编辑地址、Form 编辑地址；
- Web App 的 `doGet()` 只读取配置表，不读取任何响应或分析表；
- 不要把 Google Sheet 设为“任何人可查看”；只需要把 Apps Script Web App 配置端点开放给问卷读取；
- `Participant ID` 应为项目编码，不得直接填写姓名、电话或身份证号；
- 测试环境与正式环境使用不同 Form ID、Sheet ID 和配置地址。
