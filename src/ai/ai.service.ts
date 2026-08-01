import { GoogleGenAI, Type } from '@google/genai';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerateAiDto } from './dto/generate-ai.dto';
import { PitchCoachResponseDto } from 'src/design-sprint/dto/pitch-coach-response.dto';

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

  async generatePitchCoachAnalysis(
      projectData: Record<string, any>,
    ): Promise<PitchCoachResponseDto> {
      try {
        this.logger.log(`Procesando Pitch Coach en modelo: ${this.modelName}`);
  
        const systemInstruction = `
          Eres un consultor experto en proyectos de innovación y startups.
          Tu trabajo es evaluar la viabilidad de un proyecto basado estrictamente en su resumen, problemáticas y evidencias.
          Sé estricto, crítico pero constructivo.
          Debes responder EXCLUSIVAMENTE en formato JSON cumpliendo con el esquema indicado.
        `;
  
        const prompt = `
          Por favor analiza el siguiente proyecto:
  
          - RESUMEN / DESCRIPCIÓN DEL PROYECTO:
          ${projectData.resumen || 'Sin información proporcionada.'}
  
          - PROBLEMÁTICAS IDENTIFICADAS:
          ${JSON.stringify(projectData.problematicas || [], null, 2)}
  
          - EVIDENCIAS Y PROTOTIPO:
          ${JSON.stringify(projectData.evidencias || [], null, 2)}
        `;
  
        const response = await this.ai.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                puntosFuertes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description:
                    'Lista de aspectos fuertes e innovadores del proyecto',
                },
                riesgos: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description:
                    'Lista de riesgos principales, vacíos o vulnerabilidades del proyecto',
                },
                preguntasCriterio: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description:
                    'Exactamente 3 preguntas difíciles que un experto real o inversionista le haría al equipo',
                },
              },
              required: ['puntosFuertes', 'riesgos', 'preguntasCriterio'],
            },
          },
        });
  
        if (!response.text) {
          throw new InternalServerErrorException(
            'La IA no devolvió una respuesta válida.',
          );
        }
  
        return JSON.parse(response.text) as PitchCoachResponseDto;
      } catch (error) {
        // 1. Solución al error 'error is of type unknown' (Línea 105)
        const errorMessage =
          error instanceof Error ? error.message : 'Error desconocido';
        const errorStack = error instanceof Error ? error.stack : undefined;
  
        this.logger.error(
          `Error al comunicarse con Gemini Pitch Coach: ${errorMessage}`,
          errorStack,
        );
  
        if (error instanceof InternalServerErrorException) {
          throw error;
        }
  
        throw new InternalServerErrorException(
          'El servicio de Inteligencia Artificial no está disponible en este momento.',
        );
      }
    }
}
