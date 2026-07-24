import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DesignSprintService } from './design-sprint.service';
import { DesignSprintController } from './design-sprint.controller';
import { DesignSprintEvidence, DesignSprintEvidenceSchema } from './design-sprint.interface';

// Importa el esquema real que usa el servicio (DesignSprintEvidence)
// Ajusta la ruta según tu estructura

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: DesignSprintEvidence.name,  // ← mismo token que inyecta el servicio
        schema: DesignSprintEvidenceSchema,
      },
    ]),
  ],
  controllers: [DesignSprintController],
  providers: [DesignSprintService],
  exports: [DesignSprintService],
})
export class DesignSprintModule {}