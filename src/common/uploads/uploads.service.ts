import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

import { BadRequestException, Injectable } from '@nestjs/common';

import { UploadedFile } from './uploaded-file';

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class UploadsService {
  async save(
    file: UploadedFile | undefined,
    directory: string,
    allowedMimeTypes: string[],
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException('File exceeds the 10MB upload limit');
    }

    const uploadDirectory = join(process.cwd(), 'uploads', directory);
    await mkdir(uploadDirectory, { recursive: true });

    const extension = this.extensionFor(file);
    const filename = `${randomUUID()}${extension}`;
    await writeFile(join(uploadDirectory, filename), file.buffer);

    return `/uploads/${directory}/${filename}`.replace(/\\/g, '/');
  }

  private extensionFor(file: UploadedFile): string {
    const fromName = extname(file.originalname).toLowerCase();
    if (fromName) {
      return fromName;
    }

    if (file.mimetype === 'application/pdf') {
      return '.pdf';
    }

    return '.jpg';
  }
}
