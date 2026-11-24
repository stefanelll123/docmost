import { Container, Title, Text, Group, Box } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";
import { getAppName } from "@/lib/config";
import { useGetCoordinatedSpacesQuery } from "@/features/space/queries/space-query";
import { AllSpacesList } from "@/features/space/components/spaces-page";
import { usePaginateAndSearch } from "@/hooks/use-paginate-and-search";
import useUserRole from "@/hooks/use-user-role";
import APP_ROUTE from "@/lib/app-route";

export default function CoordinatedSpaces() {
  const { t } = useTranslation();
  const { isAdmin } = useUserRole();
  const { search, cursor, goNext, goPrev, handleSearch } =
    usePaginateAndSearch();

  const { data } = useGetCoordinatedSpacesQuery({
    cursor,
    limit: 30,
    query: search,
  });

  if (!isAdmin) {
    return <Navigate to={APP_ROUTE.HOME} replace />;
  }

  return (
    <>
      <Helmet>
        <title>
          {t("Coordinated spaces")} - {getAppName()}
        </title>
      </Helmet>

      <Container size={"800"} pt="xl">
        <Group justify="space-between" mb="xl">
          <Title order={3}>{t("Coordinated spaces")}</Title>
        </Group>

        <Box>
          <Text size="sm" c="dimmed" mb="md">
            {t("Spaces you coordinate")}
          </Text>

          <AllSpacesList
            spaces={data?.items || []}
            onSearch={handleSearch}
            hasPrevPage={data?.meta?.hasPrevPage}
            hasNextPage={data?.meta?.hasNextPage}
            onNext={() => goNext(data?.meta?.nextCursor)}
            onPrev={goPrev}
          />
        </Box>
      </Container>
    </>
  );
}
