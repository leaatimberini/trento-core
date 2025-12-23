import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import * as sharp from 'sharp';
import * as fs from 'fs';
import { join } from 'path';

@Controller('uploads')
export class UploadsController {
    @Post('')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        // Optimize image
        const buffer = await sharp(file.path)
            .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

        const optimizedFilename = file.filename.replace(/\.[^/.]+$/, "") + ".webp";
        const outputPath = join(file.destination, optimizedFilename);

        fs.writeFileSync(outputPath, buffer);

        // Remove original if different
        if (file.filename !== optimizedFilename) {
            fs.unlinkSync(file.path);
        }

        return {
            filename: optimizedFilename,
            path: `/api/uploads/${optimizedFilename}`,
            originalname: file.originalname,
            mimetype: 'image/webp',
            size: buffer.length,
        };
    }
}
