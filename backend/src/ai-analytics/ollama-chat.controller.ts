import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { OllamaChatService } from './ollama-chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

@Controller('ai/chat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OllamaChatController {
    constructor(private readonly chatService: OllamaChatService) { }

    /**
     * Check if AI chat is available
     */
    @Get('status')
    getStatus() {
        return this.chatService.checkHealth();
    }

    /**
     * Chat with the AI assistant
     */
    @Post()
    @Roles('ADMIN')
    async chat(@Body() body: { message: string; history?: ChatMessage[] }) {
        return this.chatService.chat(body.message, body.history || []);
    }

    /**
     * Get quick business summary
     */
    @Get('summary')
    @Roles('ADMIN')
    getSummary() {
        return this.chatService.getQuickSummary();
    }

    /**
     * Ask a specific question
     */
    @Post('question')
    @Roles('ADMIN')
    askQuestion(@Body() body: { question: string }) {
        return this.chatService.answerQuestion(body.question);
    }
}
