import { Select, SelectProps } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useCoordinatorCandidatesQuery } from "@/features/space/queries/space-query.ts";

interface CoordinatorSelectProps
  extends Omit<SelectProps, "data" | "value" | "onChange"> {
  value?: string | null;
  onChange: (value: string | null) => void;
}

export function CoordinatorSelect({
  value,
  onChange,
  ...rest
}: CoordinatorSelectProps) {
  const { t } = useTranslation();
  const { data } = useCoordinatorCandidatesQuery();

  const options = (data ?? []).map((user) => ({
    value: user.id,
    label: `${user.name} (${user.email})`,
  }));

  return (
    <Select
      label={t("Coordinator")}
      description={t(
        "The coordinator is added to the space with full access. Only admins and owners can be selected.",
      )}
      placeholder={t("Select a coordinator")}
      variant="filled"
      searchable
      data={options}
      value={value ?? null}
      onChange={onChange}
      nothingFoundMessage={t("Nothing found")}
      {...rest}
    />
  );
}
