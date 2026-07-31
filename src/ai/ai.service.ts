import { GoogleGenAI } from '@google/genai';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerateAiDto } from './dto/generate-ai.dto';

@Injectable()
export class AiService {
  private readonly ai: GoogleGenAI;
  private readonly modelName: string;
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('AI_API_KEY');
    this.modelName =
      this.configService.get<string>('AI_MODEL') || 'gemini-3.5-flash';

    if (!apiKey) {
      this.logger.error(
        'No se encontró AI_API_KEY en las variables de entorno.',
      );
    }

    // Inicializamos el cliente oficial de Google GenAI con la llave del .env
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Método central para consumir Gemini 3.5 Flash desde cualquier otro módulo
   */
  async generateStructuredResponse(dto: GenerateAiDto): Promise<string> {
    try {
      this.logger.log(`Ejecutando prompt en modelo: ${this.modelName}`);

      const interaction = await this.ai.interactions.create({
        model: this.modelName,
        input: dto.systemInstruction
          ? `${dto.systemInstruction}\n\n${dto.prompt}`
          : dto.prompt,
      });

      // 1. Solución al 'undefined': Validamos explícitamente que devolvió texto
      if (!interaction.output_text) {
        throw new InternalServerErrorException(
          'El modelo de IA procesó la solicitud pero no devolvió una respuesta textual válida.',
        );
      }

      return interaction.output_text;
    } catch (error) {
      // Si el error es nuestra propia excepción controlada de arriba, la lanzamos de nuevo
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      // 2. Solución al 'unknown': Estrechamiento de tipos seguro
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error desconocido al procesar con IA';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Error al comunicarse con Gemini: ${errorMessage}`,
        errorStack,
      );

      throw new InternalServerErrorException(
        'El servicio de Inteligencia Artificial no está disponible en este momento. Intenta de nuevo más tarde.',
      );
    }
  }
}
