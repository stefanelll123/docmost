import { PartialType } from '@nestjs/mapped-types';
import { CreateSpaceDto } from './create-space.dto';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, IsIn } from 'class-validator';
import { SpaceVisibility } from '../../../common/helpers/types/permission';

export class UpdateSpaceDto extends PartialType(CreateSpaceDto) {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  spaceId: string;

  @IsOptional()
  @IsBoolean()
  disablePublicSharing: boolean;

  @IsOptional()
  @IsString()
  @IsIn([SpaceVisibility.OPEN, SpaceVisibility.PRIVATE])
  visibility?: SpaceVisibility;
}
