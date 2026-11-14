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

### AI 服务商

用 Anthropic SDK 上的 Claude Haiku 5.5 替换了 Google Gemini（`@google/generative-ai` 已被 Google 弃用）。JSON 结果现在通过结构化输出由 Zod 模式约束，不再依赖提示词加清洗代码；拒绝回答或输出被截断会在解析前被识别。详见 `docs/ARCHITECTURE.md` 的 AI usage 一节。环境变量改为 `ANTHROPIC_API_KEY`。

### 第二轮：安全、流程缺口与语言

在第一次审计之后，按路线图完成。

- **身份文件私有化。** KYC 图片和签署协议扫描件改为 Cloudinary 的 `authenticated` 私有资源。
  - 只能通过 `/api/files/kyc/...` 和 `/api/files/signature-proofs/...` 访问。这两个接口先检查请求者身份，再跳转到 5 分钟后失效的签名链接。
  - 之前上传的文件在运行一次 `scripts/make-private-assets.ts` 之前仍是公开的。
- **身份证号不再发给 AI。** 每次调用 Claude 前，马来西亚身份证号会被替换成占位符（`src/lib/icRedaction.ts`），返回后在服务器端还原：协议正文中是完整号码，摘要和风险提示中是遮盖后的号码。
- **按文件内容校验上传。** 所有上传接口都根据文件开头的字节判断真实类型（`src/lib/uploadValidation.ts`），并使用随机文件名。KYC 以外的上传加了限流。
- **重置密码。** 令牌以原子方式占用，其他未使用的重置链接会被作废。
- **统一密码规则。** 注册和重置都是 12–128 位（`src/lib/passwordPolicy.ts`）。
- **租客查询。** 加了限流，且不再暴露已删除或已停用的账号。
- **管理员引导。** 改为在构建时运行（`npm run admin:bootstrap`），不再每次页面请求都执行。不会提升碰巧使用 `ADMIN_EMAIL` 的已有账号，也会拒绝过弱的管理员密码。
- **一个租客多份租约。** 有多份租约的租客会在 `/dashboard/tenant/tenancy` 看到列表，每份租约有独立页面。通知、邮件和提醒都指向具体租约，消息页可在不同租约的对话之间切换。
- **取消租约。** 房东可以取消邀请或尚未开始的租约。租客撤回遵循相同规则：押金已提交或租客已签署后不能取消。超过 30 天无人回应的邀请由每日定时任务自动删除。
- **编辑房产。** 被驳回的房源保存后会自动重新提交审核。已认证的房源只有改动地址时才需要重新审核。存在进行中租约时地址被锁定，房东现在也能看到管理员的驳回理由。
- **小修复：**
  - 过期租约可直接进入续约页面；
  - 删除有历史租约的房间会给出明确提示，而不是 500；
  - 仪表盘提示条链接到需要处理的页面。
- **马来语界面。** 个人资料页新增语言切换。目前已翻译：
  - 导航外壳、通知和提示条；
  - 仪表盘和所有状态标签；
  - 租客租约页和消息页。
  - 词典有类型约束，漏掉马来语翻译会导致构建失败。

### 测试

新增 `tests/unit/audit-fixes.test.ts`、`security.test.ts`、`flow-gaps.test.ts` 和 `i18n.test.ts`。目前共 70 个测试。

---

## 第二部分：待处理问题（未改动）

### 🔴 安全与隐私

1. **轮换泄露的密钥。** 提交的源码压缩包包含带真实凭据的 `.env`（数据库、NextAuth、Gemini、Cloudinary、Sepolia 私钥、Resend、Upstash、管理员密码）。请全部轮换，步骤见 [`DEPLOYMENT.md`](DEPLOYMENT.md)。
2. **其他个人文件仍是公开链接。**
   - 付款、押金和退款凭证（银行单据）以及房屋状况照片，只从检查归属的页面链接，但拿到网址的人都能打开。
   - 可以沿用 KYC 图片的私有文件机制（`getAssetAccessUrl` 加一个 `/api/files/...` 接口）。
3. **注册会暴露已有账号。** "邮箱已注册"和"身份证号已注册"返回不同的错误，可被用来探测哪些邮箱或身份证号有账号。
4. **停用状态依赖代理层和会话。** 路由处理函数自身不检查 `isSuspended`。JWT 每次请求都会重新读取，但统一的 `requireActiveUser()` 辅助函数会更稳妥。
5. **AI 服务商仍会收到其他个人资料。** 身份证号已遮盖，但姓名、邮箱、电话和地址仍会发送给 Anthropic。应在隐私说明或用户同意中注明。

### 🔴 流程缺口

1. **PENDING 状态的租约永不过期。** 目前只有无人回应的邀请会被自动清除。
2. **已关联的企业住户没有任何权限。**
   - `CorporateOccupant.linkedUserId` 有写入但从未读取，关联住户实际不起作用。
   - 已移除的住户还能被重新关联。
3. **审核期间仍可修改房屋状况证据。**
   - 对方审核时（`PENDING_REVIEW`、`COUNTER_EVIDENCE_ADDED`），证据仍可编辑。
   - 任何一方都能修改对方的草稿清单。
4. **对已定稿协议点击"重新生成"。** 会悄悄把租客正在审阅的版本重置为草稿。建议加确认步骤或直接禁止。
5. **定稿会覆盖已生效租约的条款。** 即使押金已付清，仍会覆盖租金、押金和日期。
6. **时间线的"状况"步骤在进行中的租约上永远无法到达**（`src/lib/uiRedesign.ts`）。
7. **有历史租约的房间完全不能删除**（现在是有意如此，并有明确提示）。可以考虑增加"归档房间"功能，让房东把它们隐藏起来。

### 🟠 数据库（需要迁移）

1. **缺少索引：**
   - `Room.propertyId`
   - `ConditionPhoto.reportId`
   - `PropertyPhoto.propertyId`
   - `DepositDeduction.refundId`
   - `CoTenant.tenancyId`
   - `Notification(userId, createdAt)`
2. **删除限制。** `AuditLog.actor` 限制删除，因此用户只要执行过被审计的操作，`scripts/delete-users.ts` 就会失败。
3. **系统操作没有执行者。** 定时任务把过期邀请记录在房东名下，因为 `AuditLog.actorId` 是必填项。改成可为空（或建一个系统用户）会更准确。
4. **从未写入的枚举值：**
   - `ReportStatus.SUBMITTED` 和 `LOCKED`
   - `AgreementEventType.SIGNED`
   - `NotificationType.CONDITION_REPORT_CREATED`、`CONDITION_REPORT_ACKNOWLEDGED` 和 `MUTUAL_TERMINATION_PROPOSED`
   - `PaymentStatus.LATE`
5. **通知类型被挪作他用。**
   - `DEPOSIT_REFUND_PAID` 用于"所有扣款已达成一致"。
   - `MUTUAL_TERMINATION_RESPONDED` 用于单方面终止。
   - `INVITATION_RESPONDED` 现在也用于取消和过期。
   - 单独的 `INVITATION_CANCELLED` 类型会更清楚。
6. **金额合计用浮点数计算。** 扣款和退款用 JS 浮点数相加，应改用整数分或 `Prisma.Decimal`。
7. **没有事务包裹的写入。** 删除房产不在同一事务中，且会留下 Cloudinary 上的孤立照片。协议版本号在并发保存时可能触发唯一约束冲突。

### 🟠 需决定保留或删除

1. **翻译覆盖范围。** 以下页面仍只有英文：
   - 协议查看器和编辑器；
   - 向导；
   - 房屋状况报告；
   - 押金结算；
   - 付款；
   - 房东的房产和租约详情页；
   - 管理后台；
   - 登录和注册页（没有会话可读取语言）。
2. **没有界面调用的 API：**
   - `DELETE /api/agreements/[id]`、`DELETE /api/condition-reports/[id]`、`condition-reports/[id]/acknowledge`
   - `PATCH /api/rooms/[id]`
   - `GET /api/kyc/status`、`GET /api/messages/unread`
   - `/api/admin/users/[id]/revoke`
   - 多个资源的 GET 接口，以及 `terminate` 中的租客分支
3. **构建脚本中执行迁移。** `npm run build` 里的 `prisma migrate deploy` 在预览构建中也会运行（见 [`DEPLOYMENT.md`](DEPLOYMENT.md)）。
4. **`verifyHashOnChain` 未使用。** 它在 `src/lib/blockchain.ts` 中，很适合做"链上验证"按钮。

### 🟡 一致性与重构

1. **近似重复的组件。** 有三个凭证上传组件和三个批准/拒绝卡片。建议抽取通用的 `ProofUploader` 和 `ReviewCard`。
2. **复制粘贴的辅助函数。** `formatRM` / `formatDate` 被复制到许多文件里。建议统一放到 `src/lib/format.ts`，使用 `src/lib/i18n.ts` 的 `localeFor()` 和 `Asia/Kuala_Lumpur` 时区。
3. **`AgreementViewer.tsx`（1174 行）** 在深色外壳里仍是浅色主题。建议拆分并完成主题迁移。
4. **没有共享的路由辅助函数。** 每个路由都重复写权限和归属检查。错误状态码（401 与 403）和措辞不一致，部分路由还在用已弃用的 zod 4 API。
5. **时区。** 许多客户端组件格式化日期时没有指定 `timeZone: 'Asia/Kuala_Lumpur'`，会导致水合警告，并在 UTC 服务器上出现日期差一天的问题。
6. **没有 `loading.tsx` 和分页**，数据量大的仪表盘和列表都受影响。
7. **`Project_Limitations.docx` 与代码不符。**
   - 它说消息功能被推迟、界面只有英文。
   - 它说 KYC 需要地址证明。
   - 它说 Gemini 负责 OCR。
   - 提交前需要更新。
