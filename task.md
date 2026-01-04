> 假设：用户管理、角色管理、权限管理模块已实现，本设计聚焦于**工作流核心功能模块**

---

## 一、技术栈说明

- **框架**：NestJS + Fastify（替代 Express，提升性能）
- **数据库**：MySql
- **ORM**：TypeORM
- **缓存**：Redis（用于流程实例状态缓存、待办任务缓存）
- **消息队列**：Bull（用于异步任务处理）
- **工作流引擎**：自研轻量级引擎（基于状态机）

---

## 二、核心功能模块划分

```bash
src/
├── workflow/               # 工作流核心模块
│   ├── definitions/        # 流程定义管理
│   ├── instances/          # 流程实例管理
│   ├── tasks/              # 任务管理
│   ├── components/         # 节点组件管理
│   ├── connectors/         # 连接器管理
│   └── monitoring/         # 监控告警
└── app.module.ts
```

---

## 三、数据库结构设计

### 3.1 流程定义表（workflow_definitions）

```sql
CREATE TABLE workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  definition JSONB NOT NULL,        -- 流程图JSON定义
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, published, archived
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN DEFAULT false
);

-- 索引
CREATE INDEX idx_workflow_def_name ON workflow_definitions(name);
CREATE INDEX idx_workflow_def_status ON workflow_definitions(status);
CREATE INDEX idx_workflow_def_created_by ON workflow_definitions(created_by);
```

### 3.2 流程实例表（workflow_instances）

```sql
CREATE TABLE workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id UUID NOT NULL REFERENCES workflow_definitions(id),
  definition_version INTEGER NOT NULL,
  name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'running', -- running, completed, failed, suspended, terminated
  current_node_id VARCHAR(100),                 -- 当前执行节点ID
  variables JSONB,                              -- 流程变量
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  duration_ms BIGINT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_workflow_instance_def_id ON workflow_instances(definition_id);
CREATE INDEX idx_workflow_instance_status ON workflow_instances(status);
CREATE INDEX idx_workflow_instance_created_by ON workflow_instances(created_by);
CREATE INDEX idx_workflow_instance_current_node ON workflow_instances(current_node_id);
```

### 3.3 任务表（workflow_tasks）

```sql
CREATE TABLE workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES workflow_instances(id),
  node_id VARCHAR(100) NOT NULL,                 -- 节点ID
  node_name VARCHAR(255) NOT NULL,               -- 节点名称
  task_type VARCHAR(50) NOT NULL,                -- human, system
  assignee_id UUID REFERENCES users(id),         -- 处理人
  candidate_users UUID[],                        -- 候选用户列表
  candidate_roles UUID[],                        -- 候选角色列表
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, assigned, completed, failed
  priority INTEGER DEFAULT 0,
  due_date TIMESTAMP,
  variables JSONB,                               -- 任务变量
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- 索引
CREATE INDEX idx_workflow_task_instance_id ON workflow_tasks(instance_id);
CREATE INDEX idx_workflow_task_assignee ON workflow_tasks(assignee_id);
CREATE INDEX idx_workflow_task_status ON workflow_tasks(status);
CREATE INDEX idx_workflow_task_due_date ON workflow_tasks(due_date);
```

### 3.4 节点组件表（workflow_components）

```sql
CREATE TABLE workflow_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,                     -- start, end, task, gateway, event, subflow
  category VARCHAR(50) NOT NULL,                 -- core, custom
  icon VARCHAR(100),
  config_schema JSONB,                           -- 配置JSON Schema
  implementation TEXT,                           -- 实现代码或配置
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.5 连接器表（workflow_connectors）

```sql
CREATE TABLE workflow_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,                     -- http, database, message_queue, custom
  config JSONB NOT NULL,                         -- 连接配置（加密存储）
  test_status VARCHAR(20) DEFAULT 'untested',    -- untested, success, failed
  last_test_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.6 监控告警表（workflow_alerts）

```sql
CREATE TABLE workflow_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  condition_type VARCHAR(50) NOT NULL,           -- timeout, failure, performance
  condition_config JSONB NOT NULL,               -- 告警条件配置
  notification_channels JSONB NOT NULL,           -- 通知渠道配置
  workflow_definition_id UUID REFERENCES workflow_definitions(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 四、API 接口设计

### 4.1 流程定义管理（workflow/definitions）

| 方法 | 路径                               | 描述                 | 权限                        |
| ---- | ---------------------------------- | -------------------- | --------------------------- |
| POST | /workflow/definitions              | 创建流程定义         | workflow:definition:create  |
| GET  | /workflow/definitions              | 获取流程定义列表     | workflow:definition:read    |
| GET  | /workflow/definitions/:id          | 获取流程定义详情     | workflow:definition:read    |
| PUT  | /workflow/definitions/:id          | 更新流程定义         | workflow:definition:update  |
| POST | /workflow/definitions/:id/publish  | 发布流程定义         | workflow:definition:publish |
| POST | /workflow/definitions/:id/archive  | 归档流程定义         | workflow:definition:archive |
| GET  | /workflow/definitions/:id/versions | 获取流程定义版本历史 | workflow:definition:read    |

### 4.2 流程实例管理（workflow/instances）

| 方法 | 路径                                   | 描述             | 权限                        |
| ---- | -------------------------------------- | ---------------- | --------------------------- |
| POST | /workflow/instances                    | 启动流程实例     | workflow:instance:create    |
| GET  | /workflow/instances                    | 获取流程实例列表 | workflow:instance:read      |
| GET  | /workflow/instances/:id                | 获取流程实例详情 | workflow:instance:read      |
| POST | /workflow/instances/:id/suspend        | 暂停流程实例     | workflow:instance:suspend   |
| POST | /workflow/instances/:id/resume         | 恢复流程实例     | workflow:instance:resume    |
| POST | /workflow/instances/:id/terminate      | 终止流程实例     | workflow:instance:terminate |
| GET  | /workflow/instances/:id/execution-path | 获取执行路径     | workflow:instance:read      |

### 4.3 任务管理（workflow/tasks）

| 方法 | 路径                         | 描述                      | 权限                   |
| ---- | ---------------------------- | ------------------------- | ---------------------- |
| GET  | /workflow/tasks              | 获取任务列表（待办/已办） | workflow:task:read     |
| GET  | /workflow/tasks/:id          | 获取任务详情              | workflow:task:read     |
| POST | /workflow/tasks/:id/complete | 完成任务                  | workflow:task:complete |
| POST | /workflow/tasks/:id/claim    | 认领任务                  | workflow:task:claim    |
| POST | /workflow/tasks/:id/delegate | 转办任务                  | workflow:task:delegate |
| POST | /workflow/tasks/:id/comment  | 添加任务评论              | workflow:task:comment  |

### 4.4 节点组件管理（workflow/components）

| 方法   | 路径                     | 描述               | 权限                      |
| ------ | ------------------------ | ------------------ | ------------------------- |
| GET    | /workflow/components     | 获取节点组件列表   | workflow:component:read   |
| POST   | /workflow/components     | 创建自定义节点组件 | workflow:component:create |
| PUT    | /workflow/components/:id | 更新节点组件       | workflow:component:update |
| DELETE | /workflow/components/:id | 删除节点组件       | workflow:component:delete |

### 4.5 连接器管理（workflow/connectors）

| 方法   | 路径                          | 描述           | 权限                      |
| ------ | ----------------------------- | -------------- | ------------------------- |
| GET    | /workflow/connectors          | 获取连接器列表 | workflow:connector:read   |
| POST   | /workflow/connectors          | 创建连接器     | workflow:connector:create |
| GET    | /workflow/connectors/:id      | 获取连接器详情 | workflow:connector:read   |
| PUT    | /workflow/connectors/:id      | 更新连接器     | workflow:connector:update |
| DELETE | /workflow/connectors/:id      | 删除连接器     | workflow:connector:delete |
| POST   | /workflow/connectors/:id/test | 测试连接器     | workflow:connector:test   |

### 4.6 监控告警管理（workflow/monitoring）

| 方法   | 路径                            | 描述             | 权限                       |
| ------ | ------------------------------- | ---------------- | -------------------------- |
| GET    | /workflow/monitoring/alerts     | 获取告警规则列表 | workflow:monitoring:read   |
| POST   | /workflow/monitoring/alerts     | 创建告警规则     | workflow:monitoring:create |
| PUT    | /workflow/monitoring/alerts/:id | 更新告警规则     | workflow:monitoring:update |
| DELETE | /workflow/monitoring/alerts/:id | 删除告警规则     | workflow:monitoring:delete |
| GET    | /workflow/monitoring/metrics    | 获取流程性能指标 | workflow:monitoring:read   |
| GET    | /workflow/monitoring/instances  | 获取实时实例监控 | workflow:monitoring:read   |

---

## 五、核心服务设计

### 5.1 WorkflowDefinitionService

```typescript
@Injectable()
export class WorkflowDefinitionService {
  async create(createDto: CreateWorkflowDefinitionDto, userId: string): Promise<WorkflowDefinition>;
  async findAll(query: WorkflowDefinitionQueryDto): Promise<PaginatedResult<WorkflowDefinition>>;
  async publish(id: string, userId: string): Promise<WorkflowDefinition>;
  async archive(id: string, userId: string): Promise<WorkflowDefinition>;
  async validateDefinition(definition: any): Promise<ValidationResult>;
}
```

### 5.2 WorkflowEngineService

```typescript
@Injectable()
export class WorkflowEngineService {
  async startInstance(
    definitionId: string,
    variables: any,
    userId: string,
  ): Promise<WorkflowInstance>;
  async executeNode(instanceId: string, nodeId: string, input: any): Promise<ExecutionResult>;
  async suspendInstance(instanceId: string): Promise<WorkflowInstance>;
  async resumeInstance(instanceId: string): Promise<WorkflowInstance>;
  async terminateInstance(instanceId: string): Promise<WorkflowInstance>;
}
```

### 5.3 TaskService

```typescript
@Injectable()
export class TaskService {
  async getPendingTasks(
    userId: string,
    query: TaskQueryDto,
  ): Promise<PaginatedResult<WorkflowTask>>;
  async claimTask(taskId: string, userId: string): Promise<WorkflowTask>;
  async completeTask(taskId: string, userId: string, result: any): Promise<WorkflowTask>;
  async delegateTask(taskId: string, fromUserId: string, toUserId: string): Promise<WorkflowTask>;
}
```

### 5.4 MonitoringService

```typescript
@Injectable()
export class MonitoringService {
  async getPerformanceMetrics(): Promise<PerformanceMetrics>;
  async getInstanceRealtimeData(): Promise<InstanceRealtimeData[]>;
  async checkAlertConditions(): Promise<void>; // 定时任务检查告警条件
}
```

---

## 六、关键业务逻辑说明

### 6.1 流程启动流程

1. 验证流程定义状态（必须是已发布）
2. 创建流程实例记录
3. 初始化流程变量
4. 执行开始节点
5. 根据路由规则执行下一个节点
6. 如果遇到人工任务节点，创建待办任务

### 6.2 任务分配逻辑

- **指定用户**：直接分配给指定用户
- **候选用户**：任务状态为 pending，用户可认领
- **候选角色**：查询角色下的所有用户作为候选
- **自动分配**：根据负载均衡策略自动分配

### 6.3 告警触发机制

- **定时检查**：每分钟检查一次超时任务
- **事件驱动**：流程实例失败时立即触发失败告警
- **性能监控**：统计执行时间，超过阈值触发性能告警

---

## 七、Fastify 配置优化

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      trustProxy: true,
    }),
  );

  // 启用 CORS
  app.enableCors();

  // 全局前缀
  app.setGlobalPrefix('api/v1');

  // 启用 Swagger
  if (process.env.NODE_ENV !== 'production') {
    const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
    const config = new DocumentBuilder()
      .setTitle('Workflow API')
      .setDescription('工作流流程编排系统 API 文档')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
```

---

## 八、安全与权限控制

### 8.1 权限守卫

- 使用已实现的权限管理系统
- 为每个接口添加 `@UseGuards(PermissionGuard)`
- 权限标识格式：`workflow:{module}:{action}`

### 8.2 数据权限

- 流程定义：创建者可见，或通过角色/组织架构控制
- 流程实例：创建者和相关处理人可见
- 任务：仅分配给的用户或候选用户可见

### 8.3 敏感数据处理

- 连接器配置中的密码字段需要加密存储
- 使用环境变量管理加密密钥
- 敏感操作记录审计日志

以下是详细 **开发任务清单（Todo List）** ，每个任务均标注了 **优先级（P0/P1/P2）** 和 **难易度（简单/中等/困难）** 。

---

### 📌 说明

- **优先级**：
  - **P0**：核心功能
  - **P1**：重要功能
  - **P2**：优化/扩展功能，可后续迭代

- **难易度：简单**、**中等**、**困难**

---

## ✅ 一、基础架构与配置（P0）

| 任务                                    | 优先级 | 难易度 | 说明                                      |
| --------------------------------------- | ------ | ------ | ----------------------------------------- |
| 1.1 初始化 NestJS + Fastify 项目        | P0     | 简单   | 配置 Fastify 适配器、全局管道、异常过滤器 |
| 1.2 集成 TypeORM + PostgreSQL           | P0     | 简单   | 配置数据库连接、实体扫描、迁移脚本        |
| 1.3 配置 Redis 客户端（用于缓存/队列）  | P0     | 简单   | 使用 `@nestjs/redis` 或直接集成 ioredis   |
| 1.4 集成 Bull 队列模块                  | P0     | 中等   | 用于异步任务（如告警通知、连接器调用）    |
| 1.5 配置 Swagger + 全局前缀 `/api/v1`   | P0     | 简单   | 开发环境启用 API 文档                     |
| 1.6 接入已有权限系统（PermissionGuard） | P0     | 中等   | 复用已实现的用户/角色/权限模块            |

---

## ✅ 二、流程定义管理（P0）

| 任务                                            | 优先级 | 难易度 | 说明                              |
| ----------------------------------------------- | ------ | ------ | --------------------------------- |
| 2.1 创建 `WorkflowDefinition` 实体及 Repository | P0     | 简单   | 对应 `workflow_definitions` 表    |
| 2.2 实现流程定义 CRUD 接口                      | P0     | 简单   | 包含分页、状态过滤                |
| 2.3 实现流程定义发布/归档逻辑                   | P0     | 中等   | 发布后不可编辑，版本号递增        |
| 2.4 实现流程定义 JSON Schema 校验               | P0     | 中等   | 使用 AJV 验证前端传入的流程图结构 |
| 2.5 实现流程定义版本历史查询                    | P1     | 简单   | 按 definition_id 查询所有版本     |

---

## ✅ 三、流程实例与执行引擎（P0）

| 任务                               | 优先级 | 难易度 | 说明                                 |
| ---------------------------------- | ------ | ------ | ------------------------------------ |
| 3.1 创建 `WorkflowInstance` 实体   | P0     | 简单   | 对应 `workflow_instances` 表         |
| 3.2 实现流程实例启动接口           | P0     | 困难   | 初始化变量、执行开始节点、状态机驱动 |
| 3.3 开发轻量级工作流引擎（状态机） | P0     | 困难   | 支持顺序、分支、并行、子流程等逻辑   |
| 3.4 实现流程实例暂停/恢复/终止     | P0     | 中等   | 修改状态，持久化当前上下文           |
| 3.5 实现执行路径追踪接口           | P1     | 中等   | 返回已执行节点链路（用于前端高亮）   |

---

## ✅ 四、任务管理（P0）

| 任务                               | 优先级 | 难易度 | 说明                                 |
| ---------------------------------- | ------ | ------ | ------------------------------------ |
| 4.1 创建 `WorkflowTask` 实体       | P0     | 简单   | 支持 assignee、candidate_users/roles |
| 4.2 实现待办任务列表接口（按用户） | P0     | 中等   | 支持状态、优先级、截止时间筛选       |
| 4.3 实现任务认领（claim）逻辑      | P0     | 中等   | 从 pending → assigned，绑定处理人    |
| 4.4 实现任务完成（complete）逻辑   | P0     | 困难   | 触发引擎继续执行后续节点             |
| 4.5 实现任务转办（delegate）和评论 | P1     | 中等   | 记录操作日志，通知新处理人           |

---

## ✅ 五、节点组件与连接器（P1）

| 任务                              | 优先级 | 难易度 | 说明                                    |
| --------------------------------- | ------ | ------ | --------------------------------------- |
| 5.1 创建 `WorkflowComponent` 实体 | P1     | 简单   | 预置 start/end/task/gateway 等类型      |
| 5.2 实现节点组件管理 CRUD         | P1     | 简单   | 仅管理员可创建自定义组件                |
| 5.3 创建 `WorkflowConnector` 实体 | P1     | 简单   | 存储 HTTP/DB 等连接配置（敏感字段加密） |
| 5.4 实现连接器测试接口            | P1     | 中等   | 调用外部服务验证连通性                  |
| 5.5 在流程引擎中集成连接器调用    | P1     | 困难   | 自动任务节点执行时调用对应连接器        |

---

## ✅ 六、监控与告警（P1）

| 任务                             | 优先级 | 难易度 | 说明                            |
| -------------------------------- | ------ | ------ | ------------------------------- |
| 6.1 创建 `WorkflowAlert` 实体    | P1     | 简单   | 存储告警规则（超时、失败等）    |
| 6.2 实现告警规则管理 CRUD        | P1     | 简单   | 支持绑定到特定流程定义          |
| 6.3 开发定时任务检查告警条件     | P1     | 困难   | 使用 Bull 或 `@nestjs/schedule` |
| 6.4 实现性能指标统计接口         | P1     | 中等   | 成功率、平均耗时、实例量等      |
| 6.5 集成通知渠道（邮件/Webhook） | P2     | 中等   | 通过 Bull 异步发送告警          |

---

## ✅ 七、优化与扩展（P2）

| 任务                                     | 优先级 | 难易度 | 说明                         |
| ---------------------------------------- | ------ | ------ | ---------------------------- |
| 7.1 流程实例变量快照（用于回溯）         | P2     | 中等   | 每次节点执行后保存变量快照   |
| 7.2 支持流程定义导入/导出（JSON）        | P2     | 简单   | 便于跨环境迁移               |
| 7.3 实现流程实例批量操作                 | P2     | 中等   | 批量终止、重试失败实例       |
| 7.4 添加操作审计日志                     | P2     | 简单   | 记录关键操作（发布、终止等） |
| 7.5 性能压测与优化（画布加载、实例启动） | P2     | 困难   | 使用缓存、索引优化、异步处理 |

---
