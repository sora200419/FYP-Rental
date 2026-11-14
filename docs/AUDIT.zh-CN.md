# 代码库审计报告（中文版）

审计日期：2026 年 11 月。路径均相对于 `rentalease-malaysia/`。

- 第一部分列出已**修复**的问题。
- 第二部分列出**待决定**的问题：需要产品决策、数据库迁移或较大重构。

严重程度：

| 标记 | 含义 |
|---|---|
| 🔴 高 | 数据错误、安全或隐私风险、用户流程中断 |
| 🟠 中 | 行为不一致，或随数据增长的性能问题 |
| 🟡 低 | 清理类问题 |

---

## 第一部分：已修复

### 工具链

- `npm test` 指向一个被 gitignore 的 `deployment/vitest.config.ts`。现在测试从已提交的 `vitest.config.ts` 运行，并新增 `typecheck` 和 `test:watch` 脚本。
- 项目没有 `vercel.json`，到期定时任务从未执行。现在已配置每天执行。
- `package-lock.json` 由 Windows 生成，只包含 `lightningcss` 和 `@tailwindcss/oxide` 的 Windows 原生二进制。在 Linux 上（包括 Vercel）构建会报错 `Cannot find module '../lightningcss.linux-x64-gnu.node'`。现已补齐所有平台的条目，版本不变。
- ESLint 的类型感知规则限定到 TS 文件；删除了过时的忽略项、未使用的 `@types/multer`、5 个 create-next-app 默认 SVG 以及过时的 `.gitignore` 规则。新增 `engines.node`。

### 账号

- **邮箱大小写。** 注册时邮箱原样保存，而登录和重置密码时会转小写，因此大写邮箱的用户永远无法登录。现在注册和邀请租客时都会统一为小写。
  - 修复前已用大写字母注册的账号，仍需手动执行一次 `UPDATE "User" SET email = lower(email)`。执行前先检查是否有重复。
- **已删除或已停用的提示。** 以前在密码校验前就会返回这些状态，攻击者可借此判断账号是否存在。现在只有密码正确后才会显示。
- **已删除用户。** 其会话现在会失效。
- **登录错误。** 登录表单现在会显示真实原因（已停用、已删除、限流），而不是一律显示"邮箱或密码错误"。
- **忘记密码。** 删除了永远不会触发的"已生成重置链接"分支；页面现在提示链接已发送至邮箱。
- **重置密码。** 客户端现在强制执行服务端的 12 位最小长度。
- **管理员跳转。** 管理员访问 `/dashboard` 时现在会跳转到 `/dashboard/admin`。
- **撤销认证。** 撤销用户认证时，同时把其 KYC 记录标记为已拒绝。以前用户无法重新提交。
- **审计快照。** 删除用户的审计快照不再保存密码哈希。

### 协议

- 状态为 `SIGNED` 或 `PENDING_SIGNATURE_PROOF` 的协议不能再被重新生成、编辑、AI 辅助修改或重新分析。其向导答案和租约条款也被锁定。
  - 修复前，重新生成会把已签协议重置为草稿，而它的哈希、签名记录和区块链锚定仍指向旧文本。
- **向导页面。** 协议已签署时现在会重定向离开。
- **协商轮次。** 以前轮次在提出修改时和重新生成时各加一次，导致"最多 5 轮"的上限实际只允许约 2 轮。现在只在租客提出修改时加一。
- **"协议已签署"邮件。** 押金未付时不再声称租约已生效。邮件主题不再做 HTML 转义。
- **限流。** `generate` 和 `assist` 改用 `enforceLimit`，Redis 故障时不再返回 500，也去掉了"还可生成 0 次"的文案。`analysis` 新增限流，`assist` 限制了输入长度。

### 租约生命周期

- **到期或终止后的房间。** 到期的租约从不释放房间，房间一直无法出租。终止时即使有待处理的续约邀请也会释放房间。撤回或拒绝*续约*邀请时，会释放仍在出租的房间。
  - 现在以下路径都会调用 `syncRoomAvailability`：定时任务、惰性过期、终止、续约、撤回和拒绝。
- **定时任务。** 去掉了 N+1 的房东查询，以及 30 天和 7 天重复的代码块。站内链接现在与仪表盘的去重逻辑一致，用户不会再收到重复提醒。
- **续约。** 现在会保留企业租约字段，且每个房间只能有一个待处理的续约。
- **创建租约。** 现在会校验租金大于 0、押金不小于 0，以及日期为真实的日历日期。

### 上传与付款

- **押金凭证。**
  - 只有 `PENDING` 或 `ACTIVE` 状态的租约才能上传。以前租客在 `INVITED` 状态就能上传，房东批准后会跳过邀请和身份验证环节。
  - 新增文件类型和大小校验（之前完全没有）。
- **两个凭证路由。** 先校验并上传新文件，再删除旧凭证；两者都使用统一的 Cloudinary 配置。
- **付款凭证上传组件。**
  - 同时选择多个文件时会产生竞争，每次上传都会删除其他文件。现在改为单文件上传，按钮文案改为"替换凭证"。
  - 和服务端一样支持 PDF，并用 PDF 图标代替损坏的图片。
  - 支持 `WAIVED`（已豁免）的付款。
- **已结束的租约。** 租客付款页面不再显示押金上传入口。
- **删除条件报告。** 现在使用条件照片的删除工具函数。

### 押金结算

- **房东无法添加扣款。** "开始结算"总是提交空列表，从而创建 `AGREED` 状态的退款，而该状态会隐藏扣款表单。现在房东可以先草拟扣款，再提交（进入 `PROPOSED`），或选择"全额退还"。
- **Decimal 金额。** 金额以字符串形式返回，以前在合计时会被拼接成文本。现在会先转为数字。两个结算组件在刷新后也会重新同步。
- **租客视图。** 现在显示服务端返回的退款状态和金额。
- **租客回复。** 回复路由改为单个事务，并发回复不会导致退款卡在 `IN_REVIEW`。

### 界面问题

- **向导。** 重新打开已完成的向导会显示空白步骤，进度条也会超过 100%。
- **审计日志。**
  - `?page=abc` 会导致页面崩溃。
  - 实体筛选包含不存在的 `TenantDocument`，却漏掉了真实存在的实体。
  - 大部分操作类型缺少显示名称。
- **租客仪表盘。** 协议状态标签引用了不存在的 `PENDING_TENANT`，并显示为"PENDING SIGNATURE_PROOF"。
- **租金到期日。** 显示为"21th"、"22th"或"23th"。
- **消息线程。** 即使没有新消息，每 10 秒也会跳到底部。
- **AI 辅助。** 按 Enter 键可以绕过 10 个字符的最小长度限制。
- **房产驳回。** 现在同时清除 `isVerified`。

### 已删除的死代码

- 没有任何引用的组件：`TopNav.tsx`、`VerifyButton.tsx`、`TenancyInvitationCard.tsx`（后者还会发送 API 不接受的小写动作）。
- 未使用的 410 路由：`api/admin/users/[id]/verify` 和 `api/admin/users/[id]/reject`。
- 孤立的 `admin/verify` 跳转页面。
- `lib/payments.ts` 中未使用的 `generateRentSchedule`，以及函数体为空的 `ensureNextPaymentPending`。
- `lib/cloudinary.ts` 中未使用的 `uploadPaymentProof` 和 `deleteAgreementSignatureProof`。

### 测试

新增 `tests/unit/audit-fixes.test.ts`，覆盖邮箱规范化、序数词后缀、向导续填以及租金计划。目前共 41 个测试。

---

## 第二部分：待处理问题（未改动）

### 🔴 安全与隐私

1. **身份证件是公开链接。**
   - 位置：`src/lib/cloudinary.ts`。
   - 问题：KYC 图片（身份证正反面、自拍）以及包含身份证号的签署扫描件，都以普通公开方式上传到 Cloudinary。拿到网址的人都能查看。
   - 建议：改为 `type: 'authenticated'` 上传，并通过带权限校验的接口返回有时效的签名链接。
2. **完整身份证号发送给 Gemini。**
   - 位置：`src/lib/gemini.ts`，协议提示词。
   - 问题：涉及 PDPA（个人资料保护法）。
   - 建议：发送占位符，生成后在服务端替换回真实身份证号。
3. **上传信任浏览器的 MIME 类型。**
   - 位置：所有上传路由。
   - 建议：上传前检查文件魔数（例如使用 `file-type` 包）。
4. **管理员引导每次请求都执行，且可以提权账号。**
   - 位置：`src/app/layout.tsx`。
   - 问题：根布局每次页面请求都会执行 `ensureAdminBootstrap()`，增加一次数据库查询，并使所有页面变为动态渲染。它还会把任何使用 `ADMIN_EMAIL` 的已有账号提升为管理员。
   - 建议：改为一次性脚本（如 `npm run admin:bootstrap`）或种子数据。
5. **停用状态只由 `proxy.ts` 强制执行。**
   - 问题：路由处理函数自身不检查 `isSuspended`。
   - 缓解：JWT 回调现在每次请求都会重新读取该字段，但统一的 `requireActiveUser()` 辅助函数会更稳妥。
6. **重置密码令牌可被并发使用两次。**
   - 位置：`api/reset-password`。
   - 建议：用 `updateMany({ where: { token, usedAt: null } })` 原子地占用令牌，并检查返回的计数。
7. **租客查询可被枚举。**
   - 位置：`api/tenants/lookup`。
   - 问题：任何房东都能枚举租客账号；没有限流，也没有过滤已软删除的用户。
8. **提交的压缩包里有泄露的密钥。** 提交的源码压缩包包含一个带真实凭据的 `.env`（数据库、NextAuth、Gemini、Cloudinary、Sepolia 私钥、Resend、Upstash、管理员密码）。**请轮换所有这些密钥。**
9. **注册密码规则较弱。** 注册接受 8 位密码，重置却要求 12 位。需要统一策略。

### 🔴 流程缺口

1. **续约会隐藏正在进行的租约。**
   - 位置：`tenant/tenancy` 和 `tenant/messages`。
   - 问题：两个页面都只显示**最新**的租约，一旦存在续约邀请，正在进行的 ACTIVE 租约就消失了。
   - 建议：增加租约切换器，或新增 `/dashboard/tenant/tenancy/[id]`。
2. **房东无法取消邀请或待处理（PENDING）的租约**，且待处理租约永远不会过期。
3. **有押金凭证后，撤回和拒绝可能失败。**
   - 问题：`DepositProof → Tenancy` 是 `ON DELETE RESTRICT`。
   - 撤回在租客签署或押金付清后仍被允许。需要决定是禁止还是保留记录。
4. **有过往租约的房间无法删除。**
   - 问题：`Tenancy.room` 是 `Restrict`，删除会返回 500。
   - 建议：给出明确提示阻止删除，或将房间归档。
5. **无法编辑房产。** 驳回和撤销通知让房东"更新房源"，但没有编辑页面，也没有 `PATCH /api/properties/[id]`。
6. **无法从界面续约已过期的租约。** 续约页面允许过期租约，但入口只在 ACTIVE 且 30 天内到期时显示。
7. **已关联的企业住户无任何权限。** `CorporateOccupant.linkedUserId` 有写入但从未读取，关联住户并不会获得访问权限。已移除的住户也可以被重新关联。
8. **审核期间仍可修改条件证据。** 对方审核时（`PENDING_REVIEW`、`COUNTER_EVIDENCE_ADDED`），证据仍可编辑，且任何一方都能修改对方的草稿清单。
9. **对已定稿协议点击"重新生成"。** 它会悄悄把租客正在审阅的版本重置为草稿。建议加确认步骤，或直接禁止。
10. **定稿会覆盖已生效租约的条款。** 即使押金已付清，它仍会覆盖租金、押金和日期。
11. **时间线的"条件"步骤无法到达。** `src/lib/uiRedesign.ts` 中租约时间线的"条件"步骤在正常租约上永远不可达。

### 🟠 数据库（需要迁移）

1. **缺少索引：**
   - `Room.propertyId`
   - `ConditionPhoto.reportId`
   - `PropertyPhoto.propertyId`
   - `DepositDeduction.refundId`
   - `CoTenant.tenancyId`
   - `Notification(userId, createdAt)`
2. **删除限制。**
   - `AuditLog.actor` 限制删除，因此只要用户执行过被审计的操作，`scripts/delete-users.ts` 就会失败。
   - `DepositProof.tenancy` 有相同限制。
3. **从未写入的枚举值：**
   - `ReportStatus.SUBMITTED` 和 `LOCKED`
   - `AgreementEventType.SIGNED`
   - `NotificationType.CONDITION_REPORT_CREATED`、`CONDITION_REPORT_ACKNOWLEDGED` 和 `MUTUAL_TERMINATION_PROPOSED`
   - `PaymentStatus.LATE`
4. **通知类型被复用于其他事件。** `DEPOSIT_REFUND_PAID` 用于"所有扣款已达成一致"，`MUTUAL_TERMINATION_RESPONDED` 用于单方面终止。
5. **金额合计使用浮点数。** 扣款和退款用 JS 浮点数相加。应改用整数分或 `Prisma.Decimal`。
6. **多步写入没有事务包裹：**
   - 删除房产（同时会遗留 Cloudinary 照片）；
   - 协议版本号，并发保存时可能触发唯一约束冲突。
7. **未命名的迁移目录。** `20260411061512_` 和 `20260412052917_` 名称为空（仅影响外观）。

### 🟠 需决定保留或删除

1. **未使用的双语词典。**
   - 内容：`src/lib/i18n.ts`（473 行，英文和马来文齐全）没有被引用。`User.language` 有存储，但界面没有读取。
   - 选择：接入界面（很好的 FYP 亮点），或删除。
2. **没有界面调用的 API 处理函数：**
   - `DELETE /api/agreements/[id]`、`DELETE /api/condition-reports/[id]`、`condition-reports/[id]/acknowledge`
   - `PATCH /api/rooms/[id]`
   - `GET /api/admin/kyc`、`GET /api/kyc/status`、`GET /api/messages/unread`（与 `/unread-counts` 重复）
   - `/api/admin/users/[id]/revoke`
   - 多个资源的 GET 处理函数
   - `terminate` 中的租客分支
3. **已弃用的 Gemini SDK。** `@google/generative-ai` 已被 `@google/genai` 取代。
4. **构建脚本中的迁移。** `npm run build` 中的 `prisma migrate deploy` 也会在预览构建时执行（见 [`DEPLOYMENT.md`](DEPLOYMENT.md)）。
5. **未使用的辅助导出。** `blockchain.ts` 导出的 `verifyHashOnChain` 没有被调用（它很适合做"链上验证"按钮）。`conditionReports.ts` 导出了一个未使用的常量。

### 🟡 一致性与重构

1. **近似重复的组件：**
   - 三种凭证上传组件：付款、押金、签署；
   - 三种批准/拒绝卡片；
   - `VerifyPropertyButton` 与管理员 KYC 操作。
   - 建议：抽取通用的 `ProofUploader` 和 `ReviewCard`。
2. **复制粘贴的辅助函数。**
   - `formatRM` 出现在 8 个文件中，`formatDate` 在 7 个，状态标签映射在 5 个，`toDateInput` 在 2 个。建议统一放入 `src/lib/format.ts`，并共享状态文案。
   - 页面之间的状态措辞也不一致（"Paid"、"Confirmed"、"Deposit Confirmed"；"Pending Signature" 与 "PENDING SIGNATURE PROOF"）。
3. **`AgreementViewer.tsx` 有 1174 行。** 它仍是浅色主题，嵌在深色外壳中，导致标题几乎看不见。它还包含一个内联 `<style>`（带 Google Fonts 的 `@import`）和未使用的 CSS 类。建议拆分为阅读、风险提示、历史和签署审计四部分，并改用 `next/font`。
4. **没有共享的路由辅助函数。** 没有统一的鉴权或归属检查辅助函数；角色错误时返回的 401 和 403 混用，"Unauthorised" 与 "Unauthorized" 并存，校验方式在 zod 与手写检查之间混用，还使用了已弃用的 zod 4 API（`z.string().email()`、`.datetime()`）。
5. **时区。** 客户端组件格式化日期时没有指定 `timeZone: 'Asia/Kuala_Lumpur'`，导致水合警告，并在 UTC 服务器上出现日期偏差。定时任务使用 `endDate < now` 比较，因此租约在最后一天的马来西亚时间 08:00 就会过期。
6. **没有 `loading.tsx`。** 数据库查询较重的页面在加载时没有任何反馈。
7. **没有分页。** 房东付款、管理员用户和管理员房产列表都是全量加载；管理员用户列表还会加载 ID 数组只为计数（应使用 `_count`）。
8. **根目录的 `Project_Limitations.docx` 与代码矛盾。**
   - 它说消息功能延后，但消息功能已存在。
   - 它说 KYC 需要地址证明，但 KYC 实际使用身份证正反面和自拍。
   - 它说界面只有英文，但双语词典已存在（尽管未接入）。
   - 它说 Gemini 对扫描件做 OCR，但实际并不做。
   - 提交前需要更新。
