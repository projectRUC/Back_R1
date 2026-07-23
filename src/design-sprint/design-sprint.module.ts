import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DesignSprintService } from './design-sprint.service';
import { DesignSprintController } from './design-sprint.controller';

import { DesignSprintEvidence, DesignSprintEvidenceSchema } from 'src/database/schemas/sprint-design.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DesignSprintEvidence.name, schema: DesignSprintEvidenceSchema },
    ]),
  ],
  controllers: [DesignSprintController],
  providers: [DesignSprintService],
  exports: [DesignSprintService],
})
export class DesignSprintModule {}