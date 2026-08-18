import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    // Health check endpoint - trigger de prueba para workflow CI/CD
    return 'Hello World!';
  }
}
