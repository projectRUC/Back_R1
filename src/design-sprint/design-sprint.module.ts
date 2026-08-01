import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DesignSprintService } from './design-sprint.service';
import { DesignSprintController } from './design-sprint.controller';
import { FilesModule } from 'src/files/files.module';
import { SprintDesign, SprintDesignSchema } from 'src/database/schemas/sprint-design.schema';
import { AiModule } from 'src/ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SprintDesign.name, schema: SprintDesignSchema },
    ]),
    FilesModule,
    AiModule
  ],
  controllers: [DesignSprintController],
  providers: [DesignSprintService],
  exports: [DesignSprintService],
})
export class DesignSprintModule {}