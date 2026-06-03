/* eslint-disable @typescript-eslint/no-unused-vars */
import { Body, Controller, Delete, Get, Post, Query, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { DeleteFilesDto } from './dto/delete-files.dto';
import { FileListResponseDto } from './dto/file-list-response.dto';
import { FileResponseDto } from './dto/file-response.dto';
import { QueryFilesDto } from './dto/query-files.dto';
import { FileService } from './file.service';

@ApiTags('文件管理')
@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @ApiOperation({
    summary: '上传文件',
    description: '上传单个或多个文件（multipart/form-data），支持批量上传',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: '要上传的文件列表',
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({
    status: 201,
    description: '文件上传成功',
    type: [FileResponseDto],
  })
  @ApiBadRequestResponse({
    description: '文件格式不支持或文件过大',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: '不支持的文件类型' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async uploadFiles(@Req() _request: FastifyRequest): Promise<FileResponseDto[]> {
    // TODO: 通过 @fastify/multipart 解析文件后调用 fileService
    throw new Error('Method not implemented.');
  }

  @Get('list')
  @ApiOperation({
    summary: '查询文件列表',
    description: '分页查询文件列表。管理员可查看所有文件，普通用户只能查看自己上传的文件',
  })
  @ApiQuery({ name: 'page', description: '页码', example: 1, required: false })
  @ApiQuery({ name: 'limit', description: '每页数量', example: 10, required: false })
  @ApiQuery({ name: 'search', description: '搜索关键词', example: 'report', required: false })
  @ApiQuery({ name: 'mimeType', description: 'MIME 类型筛选', example: 'image/', required: false })
  @ApiQuery({
    name: 'sortBy',
    description: '排序字段',
    example: 'createdAt',
    required: false,
  })
  @ApiQuery({
    name: 'sortOrder',
    description: '排序方向',
    example: 'DESC',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: '文件列表',
    type: FileListResponseDto,
  })
  async queryFiles(
    @Query() queryFilesDto: QueryFilesDto,
    @Req() request: FastifyRequest,
  ): Promise<FileListResponseDto> {
    const userId = (request as any).user?.userId;
    const isAdmin = (request as any).user?.roleCode === 'ADMIN';
    return this.fileService.queryFiles(userId, isAdmin, queryFilesDto);
  }

  @Get('info')
  @ApiOperation({
    summary: '获取文件详情',
    description: '根据文件 ID 获取文件详情，仅所有者或管理员可访问',
  })
  @ApiQuery({ name: 'id', description: '文件 ID', example: 'clxxxx123456' })
  @ApiResponse({
    status: 200,
    description: '文件详情',
    type: FileResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '文件不存在',
  })
  async getFile(@Query('id') id: string, @Req() request: FastifyRequest): Promise<FileResponseDto> {
    const userId = (request as any).user?.userId;
    const isAdmin = (request as any).user?.roleCode === 'ADMIN';
    return this.fileService.getFile(id, userId, isAdmin);
  }

  @Delete('batch-delete')
  @ApiOperation({
    summary: '批量删除文件',
    description: '根据文件 ID 列表批量删除文件，仅所有者或管理员可操作',
  })
  @ApiBody({ type: DeleteFilesDto })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', description: '删除的文件数量' },
        message: { type: 'string', example: '删除成功' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '文件不存在',
  })
  async deleteFiles(
    @Body() deleteFilesDto: DeleteFilesDto,
    @Req() request: FastifyRequest,
  ): Promise<{ count: number; message: string }> {
    const userId = (request as any).user?.userId;
    const isAdmin = (request as any).user?.roleCode === 'ADMIN';
    return this.fileService.deleteFiles(userId, isAdmin, deleteFilesDto);
  }
}
