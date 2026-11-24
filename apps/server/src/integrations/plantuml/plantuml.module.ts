import { Module } from '@nestjs/common';
import { PlantumlController } from './plantuml.controller';
import { PlantumlService } from './plantuml.service';

@Module({
  controllers: [PlantumlController],
  providers: [PlantumlService],
})
export class PlantumlModule {}
