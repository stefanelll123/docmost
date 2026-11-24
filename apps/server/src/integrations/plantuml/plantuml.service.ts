import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { EnvironmentService } from '../environment/environment.service';
import { encodePlantuml } from './plantuml.encoder';

const CACHE_LIMIT = 200;
const REQUEST_TIMEOUT_MS = 10000;

@Injectable()
export class PlantumlService {
  private readonly logger = new Logger(PlantumlService.name);
  private readonly cache = new Map<string, string>();

  constructor(private readonly environmentService: EnvironmentService) {}

  async renderSvg(code: string): Promise<string> {
    if (!code || !code.trim()) {
      throw new BadRequestException('Diagram code is empty');
    }

    const key = createHash('sha256').update(code).digest('hex');
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    const baseUrl = this.environmentService
      .getPlantumlServerUrl()
      .replace(/\/+$/, '');
    const url = `${baseUrl}/svg/${encodePlantuml(code)}`;

    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      this.logger.error('PlantUML server unreachable', err as Error);
      throw new BadGatewayException('PlantUML server is unavailable');
    }

    const body = await response.text();

    // the server answers 400 with an SVG describing the syntax error
    if (!response.ok && response.status !== 400) {
      throw new BadGatewayException('PlantUML server returned an error');
    }
    if (!body.includes('<svg')) {
      throw new BadGatewayException('Invalid response from PlantUML server');
    }

    if (response.ok) {
      if (this.cache.size >= CACHE_LIMIT) {
        this.cache.delete(this.cache.keys().next().value);
      }
      this.cache.set(key, body);
    }

    return body;
  }
}
