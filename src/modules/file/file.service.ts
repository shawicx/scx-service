/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { DeleteFilesDto } from './dto/delete-files.dto';
import { FileListResponseDto } from './dto/file-list-response.dto';
import { FileResponseDto } from './dto/file-response.dto';
import { QueryFilesDto } from './dto/query-files.dto';

@Injectable()
export class FileService {
  /**
   * 上传单个文件
   */
  async uploadFile(
    _userId: string,
    _file: { originalName: string; mimeType: string; size: number; buffer: Buffer },
  ): Promise<FileResponseDto> {
    throw new Error('Method not implemented.');
  }

  /**
   * 批量上传文件
   */
  async uploadFiles(
    _userId: string,
    _files: Array<{ originalName: string; mimeType: string; size: number; buffer: Buffer }>,
  ): Promise<FileResponseDto[]> {
    throw new Error('Method not implemented.');
  }

  /**
   * 查询文件列表
   */
  async queryFiles(
    _userId: string,
    _isAdmin: boolean,
    _queryFilesDto: QueryFilesDto,
  ): Promise<FileListResponseDto> {
    throw new Error('Method not implemented.');
  }

  /**
   * 获取文件详情
   */
  async getFile(_fileId: string, _userId: string, _isAdmin: boolean): Promise<FileResponseDto> {
    throw new Error('Method not implemented.');
  }

  /**
   * 批量删除文件
   */
  async deleteFiles(
    _userId: string,
    _isAdmin: boolean,
    _deleteFilesDto: DeleteFilesDto,
  ): Promise<{ count: number; message: string }> {
    throw new Error('Method not implemented.');
  }
}
