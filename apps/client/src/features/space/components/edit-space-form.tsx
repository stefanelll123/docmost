import { Group, Box, Button, TextInput, Stack, Textarea, Switch } from "@mantine/core";
import React from "react";
import { useForm, zodResolver } from "@mantine/form";
import * as z from "zod";
import { useUpdateSpaceMutation } from "@/features/space/queries/space-query.ts";
import { ISpace } from "@/features/space/types/space.types.ts";
import { useTranslation } from "react-i18next";
import useUserRole from "@/hooks/use-user-role.tsx";

const formSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(
      /^[a-zA-Z0-9]+$/,
      "Space slug must be alphanumeric. No special characters",
    ),
  visibility: z.enum(["open", "private"]).optional(),
});

type FormValues = z.infer<typeof formSchema>;
interface EditSpaceFormProps {
  space: ISpace;
  readOnly?: boolean;
}
export function EditSpaceForm({ space, readOnly }: EditSpaceFormProps) {
  const { t } = useTranslation();
  const updateSpaceMutation = useUpdateSpaceMutation();
  const { isAdmin, isOwner } = useUserRole();
  

  const form = useForm<FormValues>({
    validate: zodResolver(formSchema),
    initialValues: {
      name: space?.name,
      description: space?.description || "",
      slug: space.slug,
      visibility: space.visibility ?? "private",
    },
  });

  const handleSubmit = async (values: {
    name?: string;
    description?: string;
    slug?: string;
    visibility?: "open" | "private";
  }) => {
    const spaceData: Partial<ISpace> = {
      spaceId: space.id,
    };
    if (form.isDirty("name")) {
      spaceData.name = values.name;
    }
    if (form.isDirty("description")) {
      spaceData.description = values.description;
    }
    if (form.isDirty("slug")) {
      spaceData.slug = values.slug;
    }
    if (form.isDirty("visibility")) {
      spaceData.visibility = values.visibility;
    }
    await updateSpaceMutation.mutateAsync(spaceData);
    form.resetDirty();
  };

  return (
    <>
      <Box>
        <form onSubmit={form.onSubmit((values) => handleSubmit(values))}>
          <Stack>
            <TextInput
              id="name"
              label={t("Name")}
              placeholder={t("e.g Sales")}
              variant="filled"
              readOnly={readOnly}
              {...form.getInputProps("name")}
            />

            <TextInput
              id="slug"
              label={t("Slug")}
              variant="filled"
              readOnly={readOnly}
              {...form.getInputProps("slug")}
            />

            <Textarea
              id="description"
              label={t("Description")}
              placeholder={t("e.g Space for sales team to collaborate")}
              variant="filled"
              readOnly={readOnly}
              autosize
              minRows={1}
              maxRows={3}
              {...form.getInputProps("description")}
            />

            {isOwner && (
              <Switch
                id="visibility-open"
                label={t("Public space")}
                description={t("If enabled, anyone can view this space, but only members can edit.")}
                checked={form.values.visibility === "open"}
                onChange={(event) => form.setFieldValue("visibility", event.currentTarget.checked ? "open" : "private")}
                disabled={readOnly}
                mt="md"
              />
            )}
          </Stack>

          {!readOnly && (
            <Group justify="flex-end" mt="md">
              <Button type="submit" disabled={!form.isDirty()}>
                {t("Save")}
              </Button>
            </Group>
          )}
        </form>
      </Box>
    </>
  );
}
