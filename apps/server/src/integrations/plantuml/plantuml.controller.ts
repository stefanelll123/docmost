import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlantumlService } from './plantuml.service';
import { RenderPlantumlDto } from './plantuml.dto';

@UseGuards(JwtAuthGuard)
@Controller('plantuml')
export class PlantumlController {
  constructor(private readonly plantumlService: PlantumlService) {}

  @HttpCode(HttpStatus.OK)
  @Post('render')
  async render(@Body() dto: RenderPlantumlDto) {
    const svg = await this.plantumlService.renderSvg(dto.code);
    return { svg };
  }
}
