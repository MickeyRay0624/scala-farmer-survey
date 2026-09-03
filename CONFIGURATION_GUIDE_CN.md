# SCALA 农户调查系统：中文操作手册

更新日期：2026-09-03

配置版本：`2026-09-03-v2`

本手册供项目管理员、问卷编辑人员和数据分析人员使用。网站、Google Sheet 中的系统文字及英文主文档仍保持英文；本文件是与当前版本对应的中文操作说明。

## 1. 先看结论：现有 TEST 环境已经建好

当前测试环境已经可以使用，**不需要重新执行首次安装**。日常工作只需要打开以下两个页面：

- TEST 问卷：<https://mickeyray0624.github.io/scala-farmer-survey/?environment=test>
- 私有管理与响应 Google Sheet：<https://docs.google.com/spreadsheets/d/1DZyhnc7x4S8XZfyXCBkDs0NTx5s76eS7UfxMNm2PZvY/edit>

管理员可能还会用到：

- TEST Google Form 填写链接：<https://docs.google.com/forms/d/e/1FAIpQLSejxAeRT7OqF3hqSVHR1o7aAck6QGnS07fg5QRcMUi5aORJNg/viewform>
- TEST Google Form 编辑页面：<https://docs.google.com/forms/d/1CBnIM4l45UzDpjaARjQl4X4JLcy6yNl5wvhUVsaGZHM/edit>
- Apps Script 项目：<https://script.google.com/home/projects/1dLp8-OYK2U86gCsw52vJc8FWp1WaOW-UFN_wVAQ2OadGUlonP_6W3klj/edit>

最重要的区别是：

| 页面 | 用途 | 日常是否需要修改 |
|---|---|---|
| GitHub Pages TEST 问卷 | 农户或调查员实际看到和填写的网页 | 否，用来测试填写 |
| 私有 Google Sheet | 修改题目、选项、顺序和逻辑；查看和分析数据 | **是，这是主要工作入口** |
| Google Form | 在后台接收网站提交的数据 | 通常不要直接修改 |
| Apps Script | 创建接收表单、发布配置、自动展开 JSON | 仅管理员或技术人员使用 |

换句话说：**不要把 Google Form 当作问卷编辑器。实际问卷内容从 Google Sheet 的编辑表读取，Google Form 主要是数据接收器。**

## 2. 如何找到非技术人员使用的五张编辑表

1. 打开上面的私有管理 Google Sheet。
2. 查看页面最底部的工作表标签栏。
3. 从左到右最前面的标签应当是：
   - `START_HERE`
   - `Questions`
   - `Fields`
   - `Options`
   - `Sections`
   - `Logic`
4. 先点击 `START_HERE`。其中已经放置了通往各编辑表、TEST 问卷、Dashboard、Google Form 和 Apps Script 的快捷链接。

如果底部没有看到这些标签：

1. 在 Google Sheet 左下角点击“所有工作表”图标，图标通常位于加号附近。
2. 从列表选择 `START_HERE`、`Questions`、`Fields`、`Options`、`Sections` 或 `Logic`。
3. 如果窗口较窄，可先最大化浏览器，或横向滚动底部标签栏。
4. 仍然找不到时，重新加载一次页面。

颜色含义：

- 深绿色 `START_HERE`：起始页和快捷入口；
- 绿色 `Questions`、`Fields`、`Options`、`Sections`：日常编辑；
- 黄色 `Logic`：高级条件逻辑，修改后必须逐条测试；
- 蓝色工作表：分析结果；
- 红色 `Form_Responses`：Google Form 原始响应，不要手工改动；
- 灰色工作表：系统配置或技术映射。

Google Sheet 顶部还有 `SCALA Tools` 菜单。若暂时看不到，请重新加载管理 Sheet 并等待几秒。普通编辑人员不需要打开 Apps Script。

## 3. 最简单的日常修改流程

每次修改都按以下流程进行：

1. 在 `START_HERE` 打开相应的绿色编辑表。
2. 使用 `Command+F`（Mac）或 `Ctrl+F`（Windows）搜索题号、题目关键词或选项文字。
3. 只修改绿色单元格；灰色技术列默认已经隐藏。
4. 等待最多五分钟，让网站配置缓存更新。
5. 打开 TEST 问卷并刷新。若仍显示旧内容，使用 `Command+Shift+R`（Mac）或 `Ctrl+Shift+R`（Windows）强制刷新。
6. 用明显的测试编号完成一次提交，例如 `QA-WORDING-01`。
7. 回到管理 Sheet，检查 `Dashboard` 和 `Responses_Wide`；确认该响应的 `parse_status` 为 `OK`。

只有 TEST 验证通过后，才能把相同修改带到生产环境。

## 4. 各编辑表分别修改什么

### 4.1 Questions：修改大题标题和说明

默认简单视图中可编辑的绿色列为：

| 列 | 名称 | 作用 |
|---|---|---|
| A | `enabled` | `TRUE` 显示，`FALSE` 隐藏整个题块 |
| E | `order` | 在当前小节内的显示顺序 |
| F | `question_text` | 大题标题或题块标题 |
| G | `help_text` | 标题下的帮助说明 |
| H | `editor_notes` | 仅供内部编辑人员阅读的备注 |

有些 `question_text` 为空是正常的，因为真正显示的文字属于某个输入框，应在 `Fields` 中修改。

不要修改现有的 `block_id`、`section_id` 或 `segment_id`。这些列在简单视图中已经隐藏。

### 4.2 Fields：修改具体问题、必填状态和数值范围

默认简单视图中可编辑的绿色列为：

| 列 | 名称 | 作用 |
|---|---|---|
| A | `enabled` | 是否启用该输入项 |
| E | `order` | 在当前小节内的顺序 |
| H | `field_label` | 农户看到的具体问题或行标签 |
| I | `required` | `TRUE` 必填，`FALSE` 选填 |
| J | `placeholder` | 输入框内的示例或提示 |
| K | `min_value` | 最小允许值 |
| L | `max_value` | 最大允许值 |
| M | `step_value` | 数字输入的步长 |
| Q | `editor_notes` | 内部备注 |

不要修改现有的 `question_id`。它是网页、Google Form JSON 和分析表共同使用的稳定变量名。

### 4.3 Options：修改单选、多选和下拉选项

默认简单视图中可编辑的绿色列为：

| 列 | 名称 | 作用 |
|---|---|---|
| A | `enabled` | `TRUE` 显示，`FALSE` 暂时隐藏 |
| C | `option_order` | 选项显示顺序 |
| E | `option_label` | 农户实际看到的选项文字 |
| H | `editor_notes` | 内部备注 |

注意事项：

- 已开始正式收集数据后，不要修改现有的 `question_id` 和 `option_value`。
- `exclusive=TRUE` 表示该选项与同题其他选项互斥，例如 `None` 或 `Unknown`。
- `opens_detail_id` 通常用于选择 `Other` 后显示补充说明框。除非在修改逻辑，否则不要更改。

### 4.4 Sections：修改章节标题和章节顺序

默认简单视图中可编辑的绿色列为：

| 列 | 名称 | 作用 |
|---|---|---|
| A | `enabled` | 是否启用整个章节 |
| C | `order` | 章节在导航中的顺序 |
| D | `menu_title` | 导航中显示的短标题 |
| E | `section_title` | 页面上的完整章节标题 |
| F | `section_description` | 章节标题下的说明 |
| H | `editor_notes` | 内部备注 |

`visible_for_modules` 决定章节只向 maize、livestock 或两类受访者显示。该列默认隐藏，普通文字修改不需要动它。

### 4.5 Logic：修改条件显示逻辑

`Logic` 中的每一行表示：

> 当 `source_question_id` 的答案符合 `operator` 和 `expected_value` 时，对 `target_id` 执行 `effect`。

常见运算符：

| `operator` | 含义 | `expected_value` 示例 |
|---|---|---|
| `equals` | 单个答案等于指定值 | `Yes` |
| `contains` | 多选答案包含指定值 | `Other` |
| `any_of` | 包含列出的任意一个值 | `Regularly\|Occasionally` |
| `all_of` | 包含列出的全部值 | `maize\|livestock` |
| `not_contains` | 不包含指定值 | `None` |
| `not_empty` | 已经填写 | 留空 |
| `empty` | 尚未填写 | 留空 |
| `greater_than` | 数字大于指定值 | `10` |
| `greater_or_equal` | 数字大于或等于指定值 | `10` |

其他关键列：

- `target_type`：`element`、`block`、`question` 或 `section`；
- `effect`：`show` 或 `hide`；
- `join_mode`：同一目标有多条规则时，用 `or` 或 `and` 组合；
- `clear_when_hidden=FALSE`：隐藏后保留设备上的草稿答案，但提交时排除；
- `clear_when_hidden=TRUE`：隐藏后立刻删除答案，只能在研究团队明确同意后使用。

每次修改 `Logic` 后，都要测试“条件成立”和“条件不成立”两条路径。

## 5. 五个最常见的修改例子

### 修改题目文字

1. 先在 `Questions` 搜索题号或原题文字。
2. 若找到对应大题，修改绿色的 `question_text`。
3. 如果题目是表格中的具体一行或单个输入框，到 `Fields` 修改 `field_label`。

### 修改选项文字

1. 在 `Options` 搜索原选项文字。
2. 修改绿色的 `option_label`。
3. 如果相同文字出现多次，使用 `SCALA Tools → Show technical columns` 显示 `question_id`，确认所属问题后再改。
4. 完成后使用 `SCALA Tools → Use simple editor view` 恢复简单视图。

### 调整题目或选项顺序

1. 在同一小节内修改 `order` 或 `option_order`。
2. 建议使用 10、20、30 这样的间隔编号，以便以后插入 15 或 25。
3. 仅修改 `order` 不会把题目移动到另一个章节；跨章节移动需要技术人员检查 ID 和逻辑。

### 暂时隐藏某题或某选项

把对应行的 `enabled` 改为 `FALSE`。需要恢复时改回 `TRUE`。不要删除整行，因为历史数据仍然依赖稳定 ID。

### 新增普通问题

普通文本、长文本、数字、日期、单选、多选和下拉题可以不用改网站代码，但这属于高级编辑：

1. 选择 `SCALA Tools → Show technical columns`。
2. 在 `Fields` 新增一行。
3. 创建唯一的 `question_id`，必须以 `custom.` 开头，例如 `custom.water_training_interest`。
4. 填写已有的 `section_id`、`segment_id` 和需要的 `order`。
5. 将 `input_type` 设为 `text`、`textarea`、`number`、`date`、`radio`、`checkbox` 或 `select`。
6. 将 `create_if_missing` 设为 `TRUE`。
7. 如果是选择题，在 `Options` 中使用相同的 `question_id` 添加选项。
8. 只有当新问题需要条件显示时，才在 `Logic` 中增加规则。
9. 返回简单视图，并完整测试新增题目的显示、必填、提交和分析结果。

`custom.*` 的答案会进入 Google Form 的 `json_custom` 字段，并自动展开到 `Responses_Wide`、`JSON_Long` 和 `Codebook`。

新增重复表格、上传照片、上传文件、电子签名或地图绘制仍需要修改代码。

## 6. Google Form 能接收哪些数据

当前接收方式可以保存本问卷已经设计的各类信息，包括：

- 普通文本和长文本；
- 数字、评分和日期；
- 单选、多选和下拉选项；
- maize plots、livestock breeds、climate events、losses 和 support needs 等重复记录；
- 明确获得用户许可后的设备坐标；
- 问卷版本、环境、提交编号和其他元数据。

重复记录和大部分详细答案会先序列化成带标签的 JSON，再写入 Google Form 的段落字段。Apps Script 随后自动把它们展开成分析表。因此，Google Form 的编辑页面看起来比网页问卷简单，这是正常设计，并不表示数据丢失。

当前系统没有设计图片、文件附件、音频或签名上传。如以后需要这些内容，应先做隐私、存储容量和访问权限设计，再开发相应功能。

除非要重建接收字段，**不要在 Google Form 编辑页面手工删除、重命名或调整接收题目**。否则网站使用的 `entry.*` 映射可能失效，出现只收到时间戳而没有答案的情况。

## 7. 如何取得和分析数据

新提交会先进入 `Form_Responses`，然后由 Apps Script 自动展开到其他工作表：

| 工作表 | 数据结构 | 主要用途 |
|---|---|---|
| `Form_Responses` | Google Form 原始响应，一次提交一行 | 审计、恢复、核对是否收到提交 |
| `Responses_Wide` | 一次访谈一行，一个变量一列 | 筛选、描述统计、导出 CSV/SPSS/R |
| `JSON_Long` | 一个答案值一行 | 多选频数、数据质量检查、数据透视表 |
| `Maize_Plots` | 一个 maize plot 一行 | 地块面积、地形和类型分析 |
| `Livestock_Breeds` | 一个 breed 记录一行 | 品种来源、占比和优势分析 |
| `Climate_Events` | 一个事件或年月记录一行 | 事件频率、严重度和趋势 |
| `Losses` | 一项损失一行 | 灾害年份、影响和损失金额 |
| `Support_Needs` | 一项措施、支持或约束一行 | 支持优先级和需求分析 |
| `Codebook` | 一个稳定变量一行 | 分析人员的数据字典 |
| `Dashboard` | 汇总数量 | 快速检查自动展开是否正常 |

常用获取方式：

1. 轻量分析：直接在 `Responses_Wide` 或主题表中使用筛选、排序和数据透视表。
2. 下载文件：在 Google Sheet 选择 `File → Download`，下载 Excel、CSV 或其他格式。
3. R、Python、SPSS 或 Stata：优先导出 `Responses_Wide`，并同时保留 `Codebook`；分析多选题或重复记录时再使用 `JSON_Long` 和主题表。
4. 批量导入或修复结构后：选择 `SCALA Tools → Rebuild all analysis`。

正常的新响应会自动分析，不需要每次手工运行脚本。

## 8. SCALA Tools 菜单说明

| 菜单项 | 什么时候使用 |
|---|---|
| `1 · Create isolated TEST form` | 仅为一套全新的环境创建独立 TEST Form；现有环境不要再运行 |
| `2 · Publish TEST form` | 新 Form 检查无误后发布并验证全部 `entry.*` 映射 |
| `3 · Verify Google Form field mapping` | Google Form 接收字段被添加、删除或重建后使用 |
| `Use simple editor view` | 恢复适合非技术人员使用的隐藏技术列视图 |
| `Show technical columns` | 新增问题或排查 ID 时暂时显示全部列 |
| `Rebuild all analysis` | 批量导入或结构修复后重建分析表 |
| `Refresh codebook` | 重新生成变量字典 |
| `Show TEST links` | 显示当前 Form、响应 Sheet 和配置接口地址 |

如果 `SCALA Tools` 没有出现：

1. 重新加载 Google Sheet，并等待几秒；
2. 确认当前 Google 账号对该 Sheet 和 Apps Script 都有编辑权限；
3. 仅管理员需要进入 Apps Script，运行一次 `installAdminMenuTrigger()`，授权后再刷新 Sheet。

## 9. 第一次建立另一套 TEST 环境：逐步操作

这一节**只用于建立另一个完全独立的 TEST 或 production 副本**。只要第 1 节中的当前 TEST 链接还能正常打开，就跳过本节。

### 准备文件

本地项目目录中需要以下三个文件：

- `outputs/scala-config-20260903/SCALA_Farmer_Survey_TEST_Manager.xlsx`
- `google-apps-script/Code.gs`
- `google-apps-script/appsscript.json`

### 第一步：创建私有管理 Google Sheet

1. 打开 Google Drive。
2. 点击 `New → File upload`。
3. 选择 `SCALA_Farmer_Survey_TEST_Manager.xlsx`。
4. 上传完成后，用 Google Sheets 打开该文件。
5. 选择 `File → Save as Google Sheets`，把它转换为原生 Google Sheet。
6. 给文件重命名，例如 `[TEST] SCALA Farmer Survey Manager`。
7. 检查分享设置，保持 `Restricted`；只向项目管理员和数据人员授权。

### 第二步：加入 Apps Script

推荐使用与 Sheet 绑定的脚本：

1. 在新管理 Sheet 中选择 `Extensions → Apps Script`。
2. 删除编辑器中默认的示例函数。
3. 打开本地 `google-apps-script/Code.gs`，复制全部内容到 Apps Script 的 `Code.gs`。
4. 在 Apps Script 的项目设置中启用显示 `appsscript.json` 清单文件。
5. 打开清单文件，用本地 `google-apps-script/appsscript.json` 的内容替换它。
6. 点击保存。
7. 在函数下拉列表选择 `prepareEditorWorkspace`，点击 `Run`。
8. 第一次运行时按 Google 提示完成授权。
9. 回到管理 Sheet 并重新加载。顶部应出现 `SCALA Tools`，底部应先显示 `START_HERE` 和五张编辑表。

如果采用独立的 Apps Script 项目而不是从 Sheet 的 `Extensions` 打开：

1. 在 Apps Script 选择 `Project Settings → Script Properties`。
2. 新增属性 `SCALA_SPREADSHEET_ID`。
3. 其值为管理 Sheet URL 中 `/d/` 与 `/edit` 之间的字符串。
4. 运行一次 `installAdminMenuTrigger()`。
5. 授权后重新加载管理 Sheet。

### 第三步：创建独立 Google Form

1. 在管理 Sheet 选择 `SCALA Tools → 1 · Create isolated TEST form`。
2. 如果出现授权提示，使用负责该环境的 Google 账号确认授权。
3. 等待脚本完成。它会创建一个新的 `[TEST]` Form、连接当前 Sheet、安装提交触发器，并暂时关闭提交。
4. 选择 `SCALA Tools → Show TEST links`，打开 Form editor。
5. 核对接收字段是否存在；不要手工改名、删除或调整这些字段。
6. 回到 Sheet，选择 `SCALA Tools → 2 · Publish TEST form`。
7. 脚本会验证所有 Google Forms `entry.*` ID；只有全部映射成功后才会开放提交。

### 第四步：部署公开配置接口

1. 打开 Apps Script 项目。
2. 点击右上角 `Deploy → New deployment`。
3. 在类型中选择 `Web app`。
4. `Execute as` 选择自己。
5. `Who has access` 选择 `Anyone`。
6. 点击 `Deploy`，完成授权，并复制以 `/exec` 结尾的 URL。
7. 回到管理 Sheet 的 `Settings`，找到 `config_url`，粘贴该 URL。

这个公开接口只返回以下配置表：`Settings`、`Sections`、`Questions`、`Fields`、`Options`、`Logic` 和 `Transport_Map`。它不会返回 `Form_Responses` 或任何分析数据。

### 第五步：让网站使用新环境

这一步由技术人员完成：

1. 打开本地 `config/runtime-config.json`。
2. 在对应环境中填写新的 `config_url`。
3. 同时核对该环境的 Google Form `form_action`。
4. 提交并推送代码，让 GitHub Pages 更新。
5. 不要让 TEST 和 production 共用 Form ID、Sheet ID 或配置 URL。

### 第六步：验收

1. 打开新 TEST 网站，确认状态显示 `TEST · Online · ready to submit`。
2. 用 `QA-` 开头的 Participant ID 提交一条合成测试响应。
3. 确认 `Form_Responses` 新增一行。
4. 确认 `Responses_Wide.parse_status` 为 `OK`。
5. 确认 `Dashboard` 和相关主题表数量正确。
6. 至少测试 maize-only、livestock-only、mixed、neither/not sure、`Other`、重复记录、长文本和弱网恢复。
7. 修改 Form 映射、配置结构或 Apps Script 后，建议执行 10–20 个带标签的测试案例。

## 10. 常见问题排查

### 修改后网站仍显示旧文字

- 等待最多五分钟；
- 强制刷新浏览器；
- 确认打开的是带 `?environment=test` 的 TEST 地址；
- 确认修改的是绿色配置表，而不是 Google Form；
- 确认该行 `enabled` 为 `TRUE`。

### 网站不能提交

- 查看网站状态是否为 ready to submit；
- 检查网络连接；
- 在 `Settings` 确认 `submission_enabled=TRUE`；
- 管理员运行 `3 · Verify Google Form field mapping`；
- 映射校验失败时应暂停收集，修复后再开放。

### Form_Responses 有新行，但分析表没有更新

- 先等几秒并刷新 Sheet；
- 在 `Responses_Wide` 搜索对应 Participant ID；
- 管理员选择 `SCALA Tools → Rebuild all analysis`；
- 检查 Apps Script 的执行记录是否有错误。

### 只收到时间戳，没有答案

这通常表示 Google Form 的 `entry.*` 映射已经失效。立即暂停收集，不要继续产生正式数据；运行字段映射验证并完成一次 QA 提交后再恢复。

### Google 自带菜单仍显示中文

问卷、管理表内容和系统说明已经使用英文。Google Sheet 自带的 `File`、`Edit` 等菜单语言由当前 Google 账号的语言设置决定，不由本项目代码控制。

## 11. 数据安全和生产使用边界

- GitHub Pages 问卷和经过白名单处理的配置接口可以公开。
- 响应 Sheet、分析表、Apps Script 编辑器和 Google Form 编辑器必须保持私有。
- `Participant ID` 应使用项目编号，不要填写姓名、电话、身份证号或邮箱。
- 不要把响应导出文件、受访者 JSON 或私有 Sheet 上传到 GitHub。
- TEST 和 production 必须使用完全不同的 Form、Sheet 和配置 URL。
- 正式收集开始后，保留现有 ID 和选项值；文字调整可以测试后发布，结构调整应由技术人员审核。

## 12. 本地文件位置

- 英文主说明：`CONFIGURATION_GUIDE.md`
- 中文操作手册：`CONFIGURATION_GUIDE_CN.md`
- 条件逻辑记录：`SURVEY_LOGIC.md`
- 网站运行环境：`config/runtime-config.json`
- Apps Script：`google-apps-script/Code.gs`
- Apps Script 清单：`google-apps-script/appsscript.json`
- 新环境工作簿模板：`outputs/scala-config-20260903/SCALA_Farmer_Survey_TEST_Manager.xlsx`

