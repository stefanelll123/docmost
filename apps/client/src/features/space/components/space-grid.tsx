import { Text, SimpleGrid, Card, rem, Group, Button } from "@mantine/core";
import React from "react";
import {
  prefetchSpace,
  useGetSpacesQuery,
} from "@/features/space/queries/space-query.ts";
import { getSpaceUrl } from "@/lib/config.ts";
import { Link } from "react-router-dom";
import classes from "./space-grid.module.css";
import { formatMemberCount } from "@/lib";
import { useTranslation } from "react-i18next";
import { IconArrowRight } from "@tabler/icons-react";
import { CustomAvatar } from "@/components/ui/custom-avatar.tsx";
import { AvatarIconType } from "@/features/attachments/types/attachment.types.ts";
import CreateSpaceModal from "@/features/space/components/create-space-modal.tsx";

export default function SpaceGrid() {
  const { t } = useTranslation();
  const { data, isLoading } = useGetSpacesQuery({ limit: 10 });

  const cards = data?.items.slice(0, 9).map((space, index) => (
    <Card
      key={space.id}
      p="xs"
      radius="md"
      component={Link}
      to={getSpaceUrl(space.slug)}
      onMouseEnter={() => prefetchSpace(space.slug, space.id)}
      className={classes.card}
      withBorder
    >
      <Card.Section className={classes.cardSection} h={40}></Card.Section>
      <CustomAvatar
        name={space.name}
        avatarUrl={space.logo}
        type={AvatarIconType.SPACE_ICON}
        color="initials"
        variant="filled"
        size="md"
        mt={rem(-20)}
      />

      <Group justify="space-between" align="center" mt="xs">
        <Text fz="md" fw={500} className={classes.title}>
          {space.name}
        </Text>
        {space.visibility === 'open' && (
          <Text fz="xs" c="blue" fw={700} style={{ border: '1px solid #228be6', borderRadius: 4, padding: '0 6px' }}>
            {t('Public')}
          </Text>
        )}
      </Group>

      <Text c="dimmed" size="xs" fw={700} mt="md">
        {formatMemberCount(space.memberCount, t)}
      </Text>
    </Card>
  ));

  return (
    <>
      <Group justify="space-between" align="center" mb="md">
        <Text fz="sm" fw={500}>
          {t("Spaces you belong to")}
        </Text>
        <CreateSpaceModal />
        
      </Group>

      <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }}>{cards}</SimpleGrid>

      {data?.items && data.items.length > 9 && (
        <Group justify="flex-end" mt="lg">
          <Button
            component={Link}
            to="/spaces"
            variant="subtle"
            rightSection={<IconArrowRight size={16} />}
            size="sm"
          >
            {t("View all spaces")}
          </Button>
        </Group>
      )}
    </>
  );
}
