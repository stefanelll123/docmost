import { useState } from "react";
import { Container, Title, Text, Group, Box, Select } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";
import { getAppName } from "@/lib/config";
import {
  useCoordinatorCandidatesQuery,
  useGetAllWorkspaceSpacesQuery,
} from "@/features/space/queries/space-query";
import { AllSpacesList } from "@/features/space/components/spaces-page";
import { usePaginateAndSearch } from "@/hooks/use-paginate-and-search";
import useUserRole from "@/hooks/use-user-role";
import APP_ROUTE from "@/lib/app-route";

export default function AllSpaces() {
  const { t } = useTranslation();
  const { isOwner } = useUserRole();
  const { search, cursor, goNext, goPrev, handleSearch, resetPagination } =
    usePaginateAndSearch();
  const [coordinatorFilter, setCoordinatorFilter] = useState("all");
  const { data: candidates } = useCoordinatorCandidatesQuery();

  const { data } = useGetAllWorkspaceSpacesQuery({
    cursor,
    limit: 30,
    query: search,
    coordinatorId: coordinatorFilter === "all" ? undefined : coordinatorFilter,
  });

  if (!isOwner) {
    return <Navigate to={APP_ROUTE.HOME} replace />;
  }

  return (
    <>
      <Helmet>
        <title>
          {t("All spaces")} - {getAppName()}
        </title>
      </Helmet>

      <Container size={"800"} pt="xl">
        <Group justify="space-between" mb="xl">
          <Title order={3}>{t("All spaces")}</Title>
        </Group>

        <Box>
          <Text size="sm" c="dimmed" mb="md">
            {t(
              "All spaces in the workspace. You have read-only access to spaces you are not a member of.",
            )}
          </Text>

          <Select
            mb="md"
            w={300}
            label={t("Coordinator")}
            allowDeselect={false}
            searchable
            value={coordinatorFilter}
            onChange={(value) => {
              setCoordinatorFilter(value ?? "all");
              resetPagination();
            }}
            data={[
              { value: "all", label: t("All coordinators") },
              { value: "none", label: t("No coordinator") },
              ...(candidates ?? []).map((u) => ({
                value: u.id,
                label: u.name,
              })),
            ]}
          />

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
