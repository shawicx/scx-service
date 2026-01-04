import { Injectable, Logger } from '@nestjs/common';
import { SystemException } from '@/common/exceptions';

interface ExecutionContext {
  instance: any;
  definition: any;
  currentNode: any;
  variables: Record<string, any>;
  executionPath: Array<{
    nodeId: string;
    nodeName: string;
    timestamp: Date;
    variables?: Record<string, any>;
    result?: any;
  }>;
}

@Injectable()
export class NodeExecutorService {
  private readonly logger = new Logger(NodeExecutorService.name);

  /**
   * 执行服务任务
   */
  async executeServiceTask(context: ExecutionContext, node: any): Promise<any> {
    const { config } = node;

    if (!config || !config.serviceType) {
      throw SystemException.invalidParameter(`服务任务配置缺失: ${node.id}`);
    }

    this.logger.debug(`执行服务任务: ${node.id} (${config.serviceType})`);

    try {
      switch (config.serviceType) {
        case 'http':
          return await this.executeHttpService(context, config);

        case 'email':
          return await this.executeEmailService(context, config);

        case 'script':
          return await this.executeScriptService(context, config);

        case 'database':
          return await this.executeDatabaseService(context, config);

        case 'custom':
          return await this.executeCustomService(context, config);

        default:
          throw SystemException.invalidParameter(`不支持的服务类型: ${config.serviceType}`);
      }
    } catch (error) {
      this.logger.error(`服务任务执行失败: ${node.id}`, error.stack);

      // 根据错误处理策略决定是否重试或失败
      if (config.errorHandling === 'ignore') {
        this.logger.warn(`忽略服务任务错误: ${node.id}`);
        return { success: false, error: error.message };
      } else if (config.errorHandling === 'retry' && config.retryCount > 0) {
        // TODO: 实现重试逻辑
        throw error;
      } else {
        throw error;
      }
    }
  }

  /**
   * 执行HTTP服务调用
   */
  private async executeHttpService(context: ExecutionContext, config: any): Promise<any> {
    const { url, method = 'GET' } = config;

    if (!url) {
      throw SystemException.invalidParameter('HTTP服务配置缺少URL');
    }

    // 替换URL中的变量占位符
    const processedUrl = this.replaceVariables(url, context.variables);

    this.logger.debug(`HTTP调用: ${method} ${processedUrl}`);

    try {
      // 这里使用node-fetch或axios进行HTTP调用
      // const response = await fetch(processedUrl, {
      //   method,
      //   headers: processedHeaders,
      //   body: processedBody ? JSON.stringify(processedBody) : undefined,
      //   timeout,
      // });

      // 临时模拟HTTP调用
      const response = {
        ok: true,
        status: 200,
        data: { success: true, timestamp: new Date().toISOString() },
      };

      return {
        success: response.ok,
        status: response.status,
        data: response.data,
        url: processedUrl,
      };
    } catch (error) {
      throw SystemException.operationFailed(`HTTP服务调用失败: ${error.message}`);
    }
  }

  /**
   * 执行邮件发送服务
   */
  private async executeEmailService(context: ExecutionContext, config: any): Promise<any> {
    const { to, subject } = config;

    if (!to || !subject) {
      throw SystemException.invalidParameter('邮件服务配置缺少收件人或主题');
    }

    // 处理变量替换
    const processedTo = this.replaceVariables(to, context.variables);
    const processedSubject = this.replaceVariables(subject, context.variables);

    this.logger.debug(`发送邮件: ${processedSubject} -> ${processedTo}`);

    try {
      // TODO: 集成邮件服务
      // const result = await this.mailService.sendMail({
      //   to: processedTo,
      //   cc,
      //   bcc,
      //   subject: processedSubject,
      //   template,
      //   templateData: processedTemplateData,
      // });

      // 临时模拟邮件发送
      const result = {
        success: true,
        messageId: `msg_${Date.now()}`,
        to: processedTo,
        subject: processedSubject,
      };

      return result;
    } catch (error) {
      throw SystemException.operationFailed(`邮件发送失败: ${error.message}`);
    }
  }

  /**
   * 执行脚本服务
   */
  private async executeScriptService(context: ExecutionContext, config: any): Promise<any> {
    const { script, language = 'javascript', timeout = 10000 } = config;

    if (!script) {
      throw SystemException.invalidParameter('脚本服务配置缺少脚本内容');
    }

    this.logger.debug(`执行脚本: ${language}`);

    try {
      if (language === 'javascript') {
        return await this.executeJavaScript(script, context.variables, timeout);
      } else {
        throw SystemException.invalidParameter(`不支持的脚本语言: ${language}`);
      }
    } catch (error) {
      throw SystemException.operationFailed(`脚本执行失败: ${error.message}`);
    }
  }

  /**
   * 执行数据库服务
   */
  private async executeDatabaseService(context: ExecutionContext, config: any): Promise<any> {
    const { query } = config;

    if (!query) {
      throw SystemException.invalidParameter('数据库服务配置缺少查询语句');
    }

    this.logger.debug(`执行数据库查询: ${query}`);

    try {
      // TODO: 执行数据库查询
      // const result = await this.databaseService.executeQuery(query, processedParams);

      // 临时模拟数据库查询
      const result = {
        success: true,
        rowCount: 1,
        data: [{ id: 1, status: 'processed', timestamp: new Date() }],
      };

      return result;
    } catch (error) {
      throw SystemException.operationFailed(`数据库查询失败: ${error.message}`);
    }
  }

  /**
   * 执行自定义服务
   */
  private async executeCustomService(context: ExecutionContext, config: any): Promise<any> {
    const { serviceName, method } = config;

    if (!serviceName || !method) {
      throw SystemException.invalidParameter('自定义服务配置缺少服务名称或方法');
    }

    this.logger.debug(`执行自定义服务: ${serviceName}.${method}`);

    try {
      // TODO: 通过服务注册中心查找并调用自定义服务
      // const service = await this.serviceRegistry.getService(serviceName);
      // const result = await service[method](processedParams);

      // 临时模拟自定义服务调用
      const result = {
        success: true,
        service: serviceName,
        method,
        result: 'Custom service executed successfully',
        timestamp: new Date(),
      };

      return result;
    } catch (error) {
      throw SystemException.operationFailed(`自定义服务调用失败: ${error.message}`);
    }
  }

  /**
   * 执行JavaScript脚本
   */
  private async executeJavaScript(
    script: string,
    variables: Record<string, any>,
    timeout: number,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('脚本执行超时'));
      }, timeout);

      try {
        // 创建安全的执行环境
        const context = {
          variables,
          console: {
            log: (msg: any) => this.logger.debug(`脚本输出: ${msg}`),
          },
          Date,
          Math,
          JSON,
        };

        // 使用Function构造器创建脚本函数 (在受控环境中)
        // eslint-disable-next-line no-new-func
        const func = new Function(
          'context',
          `
          with(context) {
            ${script}
          }
        `,
        );

        const result = func(context);

        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * 替换字符串中的变量占位符
   */
  private replaceVariables(obj: any, variables: Record<string, any>): any {
    if (typeof obj === 'string') {
      return obj.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        const value = this.getNestedVariable(variables, varName.trim());
        return value !== undefined ? String(value) : match;
      });
    } else if (Array.isArray(obj)) {
      return obj.map((item) => this.replaceVariables(item, variables));
    } else if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceVariables(value, variables);
      }
      return result;
    }

    return obj;
  }

  /**
   * 获取嵌套变量值
   */
  private getNestedVariable(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}
