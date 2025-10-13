import Ajv from 'ajv';

/**
 * 流程定义JSON Schema
 * 用于验证前端传入的流程图结构
 */
export const workflowDefinitionSchema = {
  type: 'object',
  required: ['nodes', 'edges'],
  properties: {
    nodes: {
      type: 'array',
      minItems: 2, // 至少需要开始和结束节点
      items: {
        type: 'object',
        required: ['id', 'type', 'name'],
        properties: {
          id: {
            type: 'string',
            pattern: '^[a-zA-Z0-9_-]+$', // 只允许字母、数字、下划线、短横线
          },
          type: {
            type: 'string',
            enum: ['start', 'end', 'userTask', 'serviceTask', 'gateway', 'event', 'subflow'],
          },
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
          },
          x: {
            type: 'number',
          },
          y: {
            type: 'number',
          },
          config: {
            type: 'object',
            // 节点配置，根据不同类型有不同的配置项
          },
        },
        additionalProperties: false,
      },
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        required: ['source', 'target'],
        properties: {
          id: {
            type: 'string',
          },
          source: {
            type: 'string',
          },
          target: {
            type: 'string',
          },
          condition: {
            type: 'string',
            // 条件表达式，用于网关节点的条件判断
          },
          label: {
            type: 'string',
            maxLength: 50,
          },
        },
        additionalProperties: false,
      },
    },
    variables: {
      type: 'object',
      // 流程变量定义
    },
    settings: {
      type: 'object',
      properties: {
        timeout: {
          type: 'integer',
          minimum: 0,
        },
        priority: {
          type: 'integer',
          minimum: 0,
          maximum: 10,
        },
      },
    },
  },
  additionalProperties: false,
};

// 创建AJV验证器实例
const ajv = new Ajv();
export const validateWorkflowDefinition = ajv.compile(workflowDefinitionSchema);

/**
 * 验证流程定义结构
 */
export function validateDefinition(definition: any): { valid: boolean; errors?: any[] } {
  const valid = validateWorkflowDefinition(definition);

  if (!valid) {
    return {
      valid: false,
      errors: validateWorkflowDefinition.errors,
    };
  }

  // 额外的业务逻辑验证
  const businessValidation = validateBusinessRules(definition);
  if (!businessValidation.valid) {
    return businessValidation;
  }

  return { valid: true };
}

/**
 * 业务规则验证
 */
function validateBusinessRules(definition: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  const { nodes, edges } = definition;

  // 检查是否有开始节点
  const startNodes = nodes.filter((node: any) => node.type === 'start');
  if (startNodes.length === 0) {
    errors.push('流程必须包含一个开始节点');
  } else if (startNodes.length > 1) {
    errors.push('流程只能包含一个开始节点');
  }

  // 检查是否有结束节点
  const endNodes = nodes.filter((node: any) => node.type === 'end');
  if (endNodes.length === 0) {
    errors.push('流程必须包含至少一个结束节点');
  }

  // 检查节点ID唯一性
  const nodeIds = nodes.map((node: any) => node.id);
  const duplicateIds = nodeIds.filter((id: string, index: number) => nodeIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`存在重复的节点ID: ${duplicateIds.join(', ')}`);
  }

  // 检查连线的source和target是否存在对应的节点
  for (const edge of edges) {
    if (!nodeIds.includes(edge.source)) {
      errors.push(`连线的源节点不存在: ${edge.source}`);
    }
    if (!nodeIds.includes(edge.target)) {
      errors.push(`连线的目标节点不存在: ${edge.target}`);
    }
  }

  // 检查开始节点不能有输入连线
  const startNodeIds = startNodes.map((node: any) => node.id);
  const incomingToStart = edges.filter((edge: any) => startNodeIds.includes(edge.target));
  if (incomingToStart.length > 0) {
    errors.push('开始节点不能有输入连线');
  }

  // 检查结束节点不能有输出连线
  const endNodeIds = endNodes.map((node: any) => node.id);
  const outgoingFromEnd = edges.filter((edge: any) => endNodeIds.includes(edge.source));
  if (outgoingFromEnd.length > 0) {
    errors.push('结束节点不能有输出连线');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
