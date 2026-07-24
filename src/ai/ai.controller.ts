import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateAiDto } from './dto/generate-ai.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testAi(@Body() generateAiDto: GenerateAiDto) {
    const result =
      await this.aiService.generateStructuredResponse(generateAiDto);
    return {
      success: true,
      model: 'gemini-3.5-flash',
      output: result,
    };
  }
}
