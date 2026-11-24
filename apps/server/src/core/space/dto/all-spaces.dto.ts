import { IsOptional, IsString, Matches } from 'class-validator';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';

export const NO_COORDINATOR = 'none';

export class AllSpacesDto extends PaginationOptions {
  // a coordinator user id, or "none" for spaces without a coordinator
  @IsOptional()
  @IsString()
  @Matches(
    /^(none|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  )
  coordinatorId?: string;
}
