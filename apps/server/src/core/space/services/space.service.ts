import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateSpaceDto } from '../dto/create-space.dto';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { SpaceRepo } from '@docmost/db/repos/space/space.repo';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { Space, User } from '@docmost/db/types/entity.types';
import { UpdateSpaceDto } from '../dto/update-space.dto';
import { executeTx } from '@docmost/db/utils';
import { InjectKysely } from 'nestjs-kysely';
import { SpaceMemberService } from './space-member.service';
import { SpaceRole } from '../../../common/helpers/types/permission';
import { QueueJob, QueueName } from 'src/integrations/queue/constants';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { CursorPaginationResult } from '@docmost/db/pagination/cursor-pagination';
import { ShareRepo } from '@docmost/db/repos/share/share.repo';
import { WorkspaceRepo } from '@docmost/db/repos/workspace/workspace.repo';
import { LicenseCheckService } from '../../../integrations/environment/license-check.service';
import { UserRepo } from '@docmost/db/repos/user/user.repo';
import { SpaceMemberRepo } from '@docmost/db/repos/space/space-member.repo';
import { MailService } from '../../../integrations/mail/mail.service';
import { DomainService } from '../../../integrations/environment/domain.service';
import { UserRole } from '../../../common/helpers/types/permission';
import SpaceCoordinatorAssignedEmail from '@docmost/transactional/emails/space-coordinator-assigned-email';
import SpaceCoordinatorRemovedEmail from '@docmost/transactional/emails/space-coordinator-removed-email';

@Injectable()
export class SpaceService {
  private readonly logger = new Logger(SpaceService.name);

  constructor(
    private spaceRepo: SpaceRepo,
    private spaceMemberService: SpaceMemberService,
    private spaceMemberRepo: SpaceMemberRepo,
    private shareRepo: ShareRepo,
    private workspaceRepo: WorkspaceRepo,
    private userRepo: UserRepo,
    private mailService: MailService,
    private domainService: DomainService,
    private licenseCheckService: LicenseCheckService,
    @InjectKysely() private readonly db: KyselyDB,
    @InjectQueue(QueueName.ATTACHMENT_QUEUE) private attachmentQueue: Queue,
  ) {}

  private async validateCoordinator(
    coordinatorId: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ): Promise<User> {
    const coordinator = await this.userRepo.findById(
      coordinatorId,
      workspaceId,
      { trx },
    );

    if (
      !coordinator ||
      coordinator.deletedAt ||
      coordinator.deactivatedAt ||
      (coordinator.role !== UserRole.ADMIN &&
        coordinator.role !== UserRole.OWNER)
    ) {
      throw new BadRequestException(
        'Coordinator must be an active workspace admin or owner',
      );
    }

    return coordinator;
  }

  // grants the coordinator full access, upgrading an existing membership if any
  private async grantCoordinatorAccess(
    userId: string,
    spaceId: string,
    workspaceId: string,
    trx: KyselyTransaction,
  ): Promise<void> {
    const existing = await this.spaceMemberRepo.getSpaceMemberByTypeId(
      spaceId,
      { userId },
      trx,
    );

    if (!existing) {
      await this.spaceMemberService.addUserToSpace(
        userId,
        spaceId,
        SpaceRole.ADMIN,
        workspaceId,
        trx,
      );
    } else if (existing.role !== SpaceRole.ADMIN) {
      await trx
        .updateTable('spaceMembers')
        .set({ role: SpaceRole.ADMIN })
        .where('id', '=', existing.id)
        .execute();
    }
  }

  private async sendCoordinatorEmail(
    user: User,
    space: Space,
    workspaceId: string,
    assigned: boolean,
  ): Promise<void> {
    try {
      const workspace = await this.workspaceRepo.findById(workspaceId);
      const spaceUrl = `${this.domainService.getUrl(workspace?.hostname)}/s/${space.slug}`;

      await this.mailService.sendToQueue({
        to: user.email,
        subject: assigned
          ? `You are now the coordinator of ${space.name}`
          : `You are no longer the coordinator of ${space.name}`,
        template: assigned
          ? SpaceCoordinatorAssignedEmail({
              spaceName: space.name,
              spaceUrl,
            })
          : SpaceCoordinatorRemovedEmail({ spaceName: space.name }),
      });
    } catch (err) {
      this.logger.error(
        `Failed to send coordinator email to ${user.id}`,
        err as Error,
      );
    }
  }

  async createSpace(
    authUser: User,
    workspaceId: string,
    createSpaceDto: CreateSpaceDto,
    trx?: KyselyTransaction,
  ): Promise<Space> {
    let space = null;
    let coordinator: User | null = null;
    let memberCount = 1;

    await executeTx(
      this.db,
      async (trx) => {
        if (createSpaceDto.coordinatorId) {
          coordinator = await this.validateCoordinator(
            createSpaceDto.coordinatorId,
            workspaceId,
            trx,
          );
        }

        space = await this.create(
          authUser.id,
          workspaceId,
          createSpaceDto,
          trx,
        );

        await this.spaceMemberService.addUserToSpace(
          authUser.id,
          space.id,
          SpaceRole.ADMIN,
          workspaceId,
          trx,
        );

        if (coordinator && coordinator.id !== authUser.id) {
          await this.grantCoordinatorAccess(
            coordinator.id,
            space.id,
            workspaceId,
            trx,
          );
          memberCount = 2;
        }
      },
      trx,
    );

    // the coordinator is notified when someone else assigned them
    if (coordinator && coordinator.id !== authUser.id) {
      await this.sendCoordinatorEmail(coordinator, space, workspaceId, true);
    }

    return { ...space, memberCount };
  }

  async create(
    userId: string,
    workspaceId: string,
    createSpaceDto: CreateSpaceDto,
    trx?: KyselyTransaction,
  ): Promise<Space> {
    const slugExists = await this.spaceRepo.slugExists(
      createSpaceDto.slug,
      workspaceId,
      trx,
    );
    if (slugExists) {
      throw new BadRequestException(
        'Space slug exists. Please use a unique space slug',
      );
    }

    return await this.spaceRepo.insertSpace(
      {
        name: createSpaceDto.name ?? 'untitled space',
        description: createSpaceDto.description ?? '',
        creatorId: userId,
        workspaceId: workspaceId,
        slug: createSpaceDto.slug,
        coordinatorId: createSpaceDto.coordinatorId ?? null,
      },
      trx,
    );
  }

  async updateSpace(
    updateSpaceDto: UpdateSpaceDto,
    workspaceId: string,
  ): Promise<Space> {
    if (updateSpaceDto?.slug) {
      const slugExists = await this.spaceRepo.slugExists(
        updateSpaceDto.slug,
        workspaceId,
      );

      if (slugExists) {
        throw new BadRequestException(
          'Space slug exists. Please use a unique space slug',
        );
      }
    }

    if (typeof updateSpaceDto.disablePublicSharing !== 'undefined') {
      const workspace = await this.workspaceRepo.findById(workspaceId, {
        withLicenseKey: true,
      });

      if (
        !this.licenseCheckService.isValidEELicense(workspace.licenseKey)
      ) {
        throw new ForbiddenException(
          'This feature requires a valid enterprise license',
        );
      }

      await this.spaceRepo.updateSharingSettings(
        updateSpaceDto.spaceId,
        workspaceId,
        'disabled',
        updateSpaceDto.disablePublicSharing,
      );

      if (updateSpaceDto.disablePublicSharing) {
        await this.shareRepo.deleteBySpaceId(updateSpaceDto.spaceId);
      }
    }

    const existingSpace = await this.spaceRepo.findById(
      updateSpaceDto.spaceId,
      workspaceId,
    );
    if (!existingSpace) {
      throw new NotFoundException('Space not found');
    }

    const oldCoordinatorId = existingSpace.coordinatorId;
    const newCoordinatorId = updateSpaceDto.coordinatorId;
    const coordinatorChanged =
      !!newCoordinatorId && newCoordinatorId !== oldCoordinatorId;

    let newCoordinator: User | null = null;
    let oldCoordinator: User | null = null;

    const updatedSpace = await executeTx(this.db, async (trx) => {
      if (coordinatorChanged) {
        newCoordinator = await this.validateCoordinator(
          newCoordinatorId,
          workspaceId,
          trx,
        );

        await this.grantCoordinatorAccess(
          newCoordinator.id,
          existingSpace.id,
          workspaceId,
          trx,
        );

        // the creator keeps their own membership
        if (oldCoordinatorId && oldCoordinatorId !== existingSpace.creatorId) {
          oldCoordinator = await this.userRepo.findById(
            oldCoordinatorId,
            workspaceId,
            { trx },
          );
          const oldMember = await this.spaceMemberRepo.getSpaceMemberByTypeId(
            existingSpace.id,
            { userId: oldCoordinatorId },
            trx,
          );
          if (oldMember) {
            await this.spaceMemberRepo.removeSpaceMemberById(
              oldMember.id,
              existingSpace.id,
              { trx },
            );
          }
        } else if (oldCoordinatorId) {
          oldCoordinator = await this.userRepo.findById(
            oldCoordinatorId,
            workspaceId,
            { trx },
          );
        }
      }

      return this.spaceRepo.updateSpace(
        {
          name: updateSpaceDto.name,
          description: updateSpaceDto.description,
          slug: updateSpaceDto.slug,
          visibility: updateSpaceDto.visibility,
          ...(coordinatorChanged ? { coordinatorId: newCoordinatorId } : {}),
        },
        updateSpaceDto.spaceId,
        workspaceId,
        trx,
      );
    });

    if (coordinatorChanged) {
      await this.sendCoordinatorEmail(
        newCoordinator,
        updatedSpace,
        workspaceId,
        true,
      );
      if (oldCoordinator) {
        await this.sendCoordinatorEmail(
          oldCoordinator,
          updatedSpace,
          workspaceId,
          false,
        );
      }
    }

    return updatedSpace;
  }

  async getSpaceInfo(spaceId: string, workspaceId: string): Promise<Space> {
    const space = await this.spaceRepo.findById(spaceId, workspaceId, {
      includeMemberCount: true,
    });
    if (!space) {
      throw new NotFoundException('Space not found');
    }

    return space;
  }

  async getWorkspaceSpaces(
    workspaceId: string,
    pagination: PaginationOptions,
    filter?: { coordinatorId?: string; withoutCoordinator?: boolean },
  ): Promise<CursorPaginationResult<Space>> {
    return this.spaceRepo.getSpacesInWorkspace(
      workspaceId,
      pagination,
      filter,
    );
  }

  async deleteSpace(spaceId: string, workspaceId: string): Promise<void> {
    const space = await this.spaceRepo.findById(spaceId, workspaceId);
    if (!space) {
      throw new NotFoundException('Space not found');
    }

    await this.spaceRepo.deleteSpace(spaceId, workspaceId);
    await this.attachmentQueue.add(QueueJob.DELETE_SPACE_ATTACHMENTS, space);
  }
}
