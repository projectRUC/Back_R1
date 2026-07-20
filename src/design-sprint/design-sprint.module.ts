import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DesignSprintService } from './design-sprint.service';
import { DesignSprintEvidence, DesignSprintEvidenceSchema } from 'src/database/schemas/design-sprint-evidence.schema';
import { DesignSprintController } from './design-sprint.controller';

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