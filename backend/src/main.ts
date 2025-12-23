
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const isProduction = process.env.NODE_ENV === 'production';
    const app = await NestFactory.create(AppModule, {
        logger: isProduction ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    app.enableCors(); // Enable CORS for Frontend
    app.setGlobalPrefix('api');

    const port = process.env.PORT || 4000;
    await app.listen(port, '0.0.0.0'); // Bind to all interfaces for external access
    console.log(`Application is running on: http://0.0.0.0:${port}`);
}
bootstrap();
