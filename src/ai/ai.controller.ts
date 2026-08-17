import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateAiDto } from './dto/generate-ai.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Alumno', 'Docente', 'Scrum Master')
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

  @Post('generate-criteria')
  @HttpCode(HttpStatus.OK)
  async generateCriteria(@Body() body: { titulo: string; descripcion: string }) {
    const prompt = `Eres un asistente de Scrum experto. Genera una lista de 3 a 5 Criterios de Aceptación claros y testeables para la siguiente actividad o historia de usuario.
    
    Título: ${body.titulo}
    Descripción: ${body.descripcion}
    
    Devuelve los criterios en formato Markdown con checkboxes (ej. - [ ] El usuario puede...). No incluyas texto extra, saludos ni explicaciones, solo la lista de criterios.`;
    
    const result = await this.aiService.generateStructuredResponse({ prompt });
    return {
      criterios: result,
    };
  }
}
