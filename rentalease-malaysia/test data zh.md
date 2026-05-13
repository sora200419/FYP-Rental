# 测试数据

准备日期：2026-05-13

这份文件是当前 RentalEase 版本的主要人工测试参考资料。
适用于以下测试场景：
- 管理员 bootstrap 与账号审核
- 房东的房产与租约操作
- 租客邀请、协议、付款与房屋状况流程
- 双重签署协议启用流程
- 续约、终止租约与押金结算
- 企业 / 雇主租赁工作流程

## 1. 必要的 `.env` 值

请使用你现有项目中的真实 app secret、数据库、Cloudinary、Gemini、email 与 blockchain 配置，然后确认以下管理员 bootstrap 变量：

```env
ADMIN_EMAIL=admin@rentalease.my
ADMIN_PASSWORD=Admin1234!
ADMIN_NAME=RentalEase Admin
NEXTAUTH_SECRET=replace-with-your-existing-secret
```

## 2. 管理员 bootstrap

主要行为：
- 启动应用
- 打开任意 app 页面
- 如果管理员账号不存在，服务器会自动创建或重新提升该账号为管理员

受保护的备用方式：

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/internal/bootstrap-admin" `
  -Headers @{ "x-bootstrap-secret" = "<your NEXTAUTH_SECRET>" }
```

如果管理员账号原本不存在，预期结果：

```json
{ "ok": true, "action": "created", "email": "admin@rentalease.my" }
```

如果该 email 已经存在但原本只是普通用户，预期结果：

```json
{ "ok": true, "action": "promoted", "email": "admin@rentalease.my" }
```

## 3. 核心人工测试账号

如果这些账号尚未存在于数据库中，请通过 UI 注册。
建议统一使用相同密码，方便手动切换测试。

### 共用密码

```text
Test1234!
```

### 角色矩阵

| 角色 | 用途 | 姓名 | Email | 密码 | 电话 | IC 编号 |
| --- | --- | --- | --- | --- | --- | --- |
| 管理员 | bootstrap 与审核测试 | RentalEase Admin | `admin@rentalease.my` | `Admin1234!` | - | - |
| 房东 | 主要房东，大部分流程测试 | Ahmad Razif bin Hassan | `landlord@test.my` | `Test1234!` | `011-2345678` | `850101-14-5678` |
| 房东 | 次要房东 / 权限控制测试 | Siti Nur Aisyah | `landlord2@test.my` | `Test1234!` | `011-9876543` | `870505-10-2233` |
| 租客 | 主要个人租约测试账号 | Lim Mei Ling | `tenant@test.my` | `Test1234!` | `012-3456789` | `900202-08-1234` |
| 租客 | 第二位个人租客 / 替代邀请测试 | Daniel Ong | `tenant2@test.my` | `Test1234!` | `012-7777888` | `910303-10-5678` |
| 租客 | 第三位租客 / 用于 occupant account 绑定测试 | Nur Aina Binti Salleh | `tenant3@test.my` | `Test1234!` | `013-2222333` | `920404-06-8899` |
| 租客 | 企业租赁授权签署人 | Farid Rahman | `boss@test.my` | `Test1234!` | `014-1122334` | `840101-08-1111` |
| 租客 | 员工入住账号 1 | Worker A | `worker.a@test.my` | `Test1234!` | `016-1010101` | `950101-10-1234` |
| 租客 | 员工入住账号 2 | Worker B | `worker.b@test.my` | `Test1234!` | `016-2020202` | `960202-10-5678` |

## 4. 审核状态设置

在开始完整系统测试前，请确保以下状态正确：

### 房东审核状态
- `landlord@test.my` 应已通过审核，这样才能创建房产与发送租客邀请
- `landlord2@test.my` 可以先保持未审核状态，用来测试管理员批准流程

### 租客审核状态
- `tenant@test.my` 应已通过审核，用于主协议流程
- `tenant2@test.my` 可以先保持未审核状态，用来测试邀请接受被阻挡的情境
- `boss@test.my` 在接受企业租赁邀请前必须已通过审核
- `worker.a@test.my` 与 `worker.b@test.my` 可根据你的测试需求设为已审核或未审核

## 5. 房产与房间设置数据

请在主要房东账号下创建以下房产与房间。

### 房产 A：主要公寓

| 字段 | 值 |
| --- | --- |
| 地址 | 18 Jalan SS 15/4 |
| 城市 | Subang Jaya |
| 州属 | Selangor |
| 邮编 | 47500 |
| 类型 | Apartment |
| 描述 | 用于标准个人租约流程测试的主要房产 |

### 房产 A 的房间

| 房间名称 | 房型 | 浴室类型 | 浴室数量 | 家具配置 | 租金 | 最大入住人数 | WiFi | 水费 | 电费 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Master Room | MASTER | ATTACHED | 1 | FULLY_FURNISHED | 1500 | 2 | Yes | Yes | No |
| Room 2 | MEDIUM | SHARED | 1 | PARTIALLY_FURNISHED | 900 | 1 | Yes | No | No |

### 房产 B：企业员工宿舍屋

| 字段 | 值 |
| --- | --- |
| 地址 | 7 Jalan Industri 3/2 |
| 城市 | Shah Alam |
| 州属 | Selangor |
| 邮编 | 40000 |
| 类型 | Terrace |
| 描述 | 用于雇主代员工租赁与企业 occupant roster 测试 |

### 房产 B 的房间

| 房间名称 | 房型 | 浴室类型 | 浴室数量 | 家具配置 | 租金 | 最大入住人数 | WiFi | 水费 | 电费 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Staff Room A | MEDIUM | SHARED | 1 | FULLY_FURNISHED | 850 | 2 | Yes | Yes | No |
| Entire Unit | ENTIRE_UNIT | ATTACHED | 2 | PARTIALLY_FURNISHED | 3200 | 6 | Yes | No | No |

## 6. 标准租约场景

请使用以下租约记录进行人工测试。

### 场景 A：个人租约

| 字段 | 值 |
| --- | --- |
| 房东 | `landlord@test.my` |
| 租客 | `tenant@test.my` |
| 房产 | `18 Jalan SS 15/4` |
| 房间 | `Master Room` |
| 开始日期 | `2026-06-01` |
| 结束日期 | `2027-05-31` |
| 月租 | `1500` |
| 押金 | `3000` |
| 租赁主体类型 | `INDIVIDUAL` |

### 场景 B：替代邀请 / 被阻挡租客测试

| 字段 | 值 |
| --- | --- |
| 房东 | `landlord@test.my` |
| 租客 | `tenant2@test.my` |
| 房产 | `18 Jalan SS 15/4` |
| 房间 | `Room 2` |
| 开始日期 | `2026-06-15` |
| 结束日期 | `2027-06-14` |
| 月租 | `900` |
| 押金 | `1800` |
| 租赁主体类型 | `INDIVIDUAL` |

### 场景 C：企业租约

| 字段 | 值 |
| --- | --- |
| 房东 | `landlord@test.my` |
| 租赁主体类型 | `CORPORATE` |
| 公司名称 | `Restoran Maju Sdn Bhd` |
| 公司注册号 | `202601001234` |
| 授权签署人姓名 | `Farid Rahman` |
| 授权签署人 IC | `840101-08-1111` |
| 授权签署人职位 | `Operations Director` |
| 授权签署人 Email | `boss@test.my` |
| 房产 | `7 Jalan Industri 3/2` |
| 房间 | `Staff Room A` |
| 开始日期 | `2026-07-01` |
| 结束日期 | `2027-06-30` |
| 月租 | `850` |
| 押金 | `1700` |
| 初始入住人员 | `Worker A`, `Worker B` |

## 7. 协议 wizard 示例值

请使用以下数值，以便 agreement wizard 能顺利完成，并让 finalize checklist 通过。

| 项目 | 建议值 |
| --- | --- |
| Pets policy | APPROVAL |
| Pets max count | 1 |
| Pets deposit | 300 |
| Smoking policy | NOT_INDOORS |
| Overnight guests | NOTIFICATION |
| Overnight max nights | 2 |
| Quiet hours policy | STANDARD |
| Additional house rules | Keep common areas clean and do not block the hallway |
| Utility payment method | REIMBURSE_LANDLORD |
| Utility dispute method | SPLIT_50_50 |
| Internet provider | Unifi |
| Internet account manager | LANDLORD |
| AC servicing | LANDLORD |
| Pest control | LANDLORD |
| Rent due day | 5 |
| Grace period days | 3 |
| Late penalty type | FLAT |
| Late penalty amount | 50 |
| Acceptable payment methods | Bank transfer, DuitNow |
| Rent increase terms | Only after term renewal |
| Rent increase percent | 5 |
| Minor repair threshold | 150 |
| Minor repair responsible | TENANT |
| Plumbing responsible | LANDLORD |
| Electrical responsible | LANDLORD |
| Appliance responsible | LANDLORD |
| Structural responsible | LANDLORD |
| Urgent response time | 48 hours |
| Tenant notice months | 1 |
| Landlord notice months | 2 |
| Early termination penalty | FULL_DEPOSIT |
| Early termination months | 2 |
| Reinstatement level | BROOM_CLEAN |
| Subletting policy | PROHIBITED |
| Deposit refund days | 14 |
| Deduction categories | Cleaning, damage, unpaid bills |
| Dispute resolution | GOOD_FAITH_DISCUSSION |
| Utility deposit handling | INCLUDED_IN_SECURITY_DEPOSIT |
| Wizard status | Complete all steps |

## 8. 结构化改动请求示例

可选择以下一项或多项，用于协商流程测试。

### 请求 A：押金条款

| 字段 | 值 |
| --- | --- |
| 分类 | Deposit terms |
| 需要修改什么？ | Reduce the security deposit from RM 3,000 to RM 2,000. |
| 原因 | The current deposit is too high for my move-in budget. |
| 可选备注 | I can pay the reduced deposit immediately together with the first month rent. |

### 请求 B：通知期

| 字段 | 值 |
| --- | --- |
| 分类 | Notice period |
| 需要修改什么？ | Change the tenant termination notice from 2 months to 1 month. |
| 原因 | A shorter notice period is more practical for my work relocation risk. |
| 可选备注 | I am still fine with standard penalties for early termination. |

### 请求 C：维修责任

| 字段 | 值 |
| --- | --- |
| 分类 | Repairs and maintenance |
| 需要修改什么？ | Clarify that repairs above RM 150 are landlord responsibility. |
| 原因 | I want the written agreement to match the wizard settings clearly. |
| 可选备注 | Please mention urgent plumbing issues specifically. |

### 请求 D：入住与过夜访客

| 字段 | 值 |
| --- | --- |
| 分类 | Occupancy and guests |
| 需要修改什么？ | Clarify how much prior notice is needed for overnight guests. |
| 原因 | I want a clearer rule before agreeing to the clause. |
| 可选备注 | A fixed notice period such as 1 day would be clearer. |

## 9. 押金与付款凭证数据

测试付款与押金凭证上传时可使用以下数据。

### 押金凭证

| 字段 | 值 |
| --- | --- |
| 付款金额 | `RM 3000.00` |
| 付款参考编号 | `DEP-2026-0001` |
| 建议上传文件名 | `deposit-proof-tenant-main.pdf` |
| 房东审核结果 | 正向测试通过一次，负向测试拒绝一次 |

### 租金付款凭证

| 字段 | 值 |
| --- | --- |
| 首次到期日 | `2026-07-05` |
| 金额 | `RM 1500.00` |
| 付款参考编号 | `RENT-JUL-2026-0001` |
| 建议上传文件名 | `rent-july-proof.png` |

## 10. 房屋状况报告示例内容

进行入住 / 退租房屋状况测试时可使用以下备注与媒体示例。

### 入住报告备注
- 卧室墙面干净，无明显裂痕
- 床架稳定
- 冷气遥控器齐全
- 浴室洗手盆水压正常
- 窗扣稍微松动，但仍可使用

### 退租报告备注
- 书桌附近墙面有轻微擦痕
- 一颗灯泡损坏
- 衣柜内部干净
- 浴室地面已清理

### 建议照片分组
- bedroom
- bathroom
- window
- wardrobe
- general room view

## 11. 文件上传建议

你可以使用本地现有文件，或准备以下格式的占位文件：

### 身份 / 租客文件上传
- `ic-copy-main.png`
- `income-proof-main.pdf`

### 协议纸本签署证明
- `signed-agreement-proof.pdf`
- `signed-agreement-proof.jpg`
- `signed-agreement-proof.png`
- `signed-agreement-proof.heic`

### 押金 / 租金付款证明
- `deposit-proof.pdf`
- `rent-transfer-proof.png`

## 12. 建议的端到端人工测试流程

### A. 管理员审核流程

1. 以管理员身份登录。
2. 检查房东审核队列。
3. 如果 `landlord@test.my` 仍待审核，则批准它。
4. 检查租客审核队列。
5. 批准 `tenant@test.my` 与 `boss@test.my`。
6. 如需测试阻挡流程，可让 `tenant2@test.my` 暂时保持未审核状态。

### B. 房东房产流程

1. 以 `landlord@test.my` 登录。
2. 创建 Property A 与 Property B。
3. 新增列出的房间。
4. 确认房东房产列表中显示这些房产。
5. 打开房产详情页，确认房间资料正确显示。

### C. 个人租约流程

1. 使用 `tenant@test.my` 创建场景 A。
2. 以 `tenant@test.my` 登录。
3. 接受邀请。
4. 回到房东端并完成 agreement wizard。
5. 生成协议。
6. 检查 Full Agreement、Plain Language、Red Flags、Edit Agreement、History 这些 tab。
7. Finalize agreement。
8. 租客检阅后，可选择签署或提出结构化改动请求。

### D. 协议协商流程

1. 在租客端使用请求 A 与请求 B。
2. 确认房东在 `Edit Agreement` 中看见待处理的结构化请求。
3. 勾选已处理请求并储存。
4. 如果你修改了红旗相关条款，请 refresh AI analysis。
5. 重新 finalize 并再次发送给租客。
6. 确认 history 与 version tracking 正确更新。

### E. 双重签署启用流程

1. 租客在勾选 acknowledgement 后进行数字签署。
2. 确认协议状态变成 `PENDING_SIGNATURE_PROOF`。
3. 确认 tenancy 仍保持 `PENDING`，不是 `ACTIVE`。
4. 上传已签署的纸本证明文件。
5. 房东进入 tenancy detail 页面并审核上传文件。
6. 批准该文件。
7. 确认 agreement 变成 `SIGNED`。
8. 确认 tenancy 变成 `ACTIVE`。
9. 确认租金 payment schedule 只会在批准后出现。

### F. 双重签署拒绝 / 重新上传流程

1. 重复数字签署步骤。
2. 上传签署证明文件。
3. 房东以原因拒绝该文件。
4. 确认没有 rejection reason 时会被阻挡。
5. 租客可看见拒绝原因。
6. 租客重新上传修正后的文件。
7. 房东批准替换后的文件。
8. 确认 tenancy 变成 `ACTIVE`。

### G. 付款流程

1. 在 tenancy 启用后，打开租客付款页面。
2. 为第一个到期月份上传租金付款证明。
3. 房东在付款端审核该证明。
4. 正向测试批准一次，负向测试拒绝一次。
5. 确认租客收到正确的状态更新。

### H. 房屋状况报告流程

1. 房东开始建立 move-in condition report。
2. 新增依房间分组的照片与备注。
3. 租客打开 tenant condition 页面并确认该报告。
4. 之后为同一租约建立 move-out report。
5. 如流程设计要求，确认押金结算会等待 move-out 流程。

### I. 押金结算流程

1. 使用一个已终止或已到期的 tenancy。
2. 从房东端启动押金结算。
3. 新增扣款项目，例如清洁或损坏。
4. 租客查看退款提案。
5. 确认 paid / disputed 状态在 UI 中行为正确。

### J. 续约流程

1. 使用一个 active tenancy。
2. 从房东端打开续约页面。
3. 设定新的结束日期，如有需要也可调整新租金。
4. 确认系统正确建立 renewal tenancy。

### K. 终止租约流程

1. 使用一个 active tenancy。
2. 点击 `Serve Notice to Quit`。
3. 输入原因，例如 `Mutual early termination due to relocation`。
4. 确认 tenancy 状态变成 `TERMINATED`。
5. 确认系统显示后续退租相关步骤。

### L. 企业租约流程

1. 以 `landlord@test.my` 登录。
2. 使用 `boss@test.my` 作为授权签署人建立场景 C。
3. 新增初始入住人员 `Worker A` 与 `Worker B`。
4. 送出邀请。
5. 以 `boss@test.my` 登录。
6. 确认企业邀请卡片出现。
7. 确认非签署人 occupant account 无法接受邀请。
8. 由授权签署人接受邀请。
9. 房东完成 agreement wizard 并生成协议。
10. 确认协议文字包含企业租赁主体 / 授权签署人上下文。
11. 由授权签署人进行签署。
12. 上传纸本签署证明。
13. 房东批准该证明。
14. 确认 tenancy 变成 `ACTIVE`。
15. 回到房东 tenancy detail 页面，使用 corporate roster manager 执行：
    - 新增 occupant
    - 更换 occupant
    - 移除 occupant
    - 将 `Worker A` 或 `Worker B` 绑定到已注册的 tenant account email

### M. 消息与通知

1. 在房东与租客之间发送消息。
2. 确认 unread counts 会正确增加与清除。
3. 触发以下通知：
   - invitation sent
   - invitation accepted
   - agreement changes requested
   - digital signature completed
   - signed proof approved or rejected

## 13. 快速数据对照表

### 主要个人流程
- 房东：`landlord@test.my`
- 租客：`tenant@test.my`
- 房产：`18 Jalan SS 15/4`
- 房间：`Master Room`

### 次要邀请 / 权限控制流程
- 房东：`landlord@test.my`
- 租客：`tenant2@test.my`
- 房间：`Room 2`

### 企业流程
- 公司：`Restoran Maju Sdn Bhd`
- 签署人：`boss@test.my`
- 入住人员：`Worker A`, `Worker B`
- 房产：`7 Jalan Industri 3/2`
- 房间：`Staff Room A`

## 14. 重要建模说明

- `CoTenant` 适用于个人租赁中的简单额外入住者。
- 企业员工应使用专门的 corporate occupant roster，而不是 `CoTenant`。
- 企业法律行为属于授权签署人，不属于一般入住者。
- 双重签署流程是严格的：
  - 先进行数字签名
  - 再上传纸本签署证明
  - 再由房东批准
  - 只有完成以上步骤后 tenancy 才会变成 `ACTIVE`
