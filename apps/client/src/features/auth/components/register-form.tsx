import * as z from "zod";
import { useForm, zodResolver } from "@mantine/form";
import {
  Container,
  Title,
  TextInput,
  Button,
  PasswordInput,
  Box,
  Stack,
  Group,
  Anchor
} from "@mantine/core";
import classes from "./auth.module.css";
import { useTranslation } from "react-i18next";
import { useRedirectIfAuthenticated } from "@/features/auth/hooks/use-redirect-if-authenticated.ts";
import { useWorkspacePublicDataQuery } from "@/features/workspace/queries/workspace-query.ts";
import { Error404 } from "@/components/ui/error-404.tsx";
import React from "react";
import SsoLogin from "@/ee/components/sso-login.tsx";
import useAuth from "@/features/auth/hooks/use-auth";
import { Link } from "react-router-dom";
import APP_ROUTE from "@/lib/app-route.ts";

const formSchema = z
  .object({
    name: z.string().trim().min(1, { message: "Name is required" }),
    email: z.string().min(1, { message: "Email is required" }).email({ message: "Invalid email address" }),
    password: z.string().min(8, { message: "Password must be at least 8 characters" }),
    repeatPassword: z.string().min(8, { message: "Repeat your password" }),
  })
  .refine((data) => data.password === data.repeatPassword, {
    message: "Passwords do not match",
    path: ["repeatPassword"],
  });

export function RegisterForm() {
  const { t } = useTranslation();
  const { signUp, isLoading } = useAuth();
  useRedirectIfAuthenticated();
  const {
    data,
    isLoading: isDataLoading,
    isError,
    error,
  } = useWorkspacePublicDataQuery();

  const form = useForm({
    validate: zodResolver(formSchema),
    initialValues: {
      name: "",
      email: "",
      password: "",
      repeatPassword: "",
    },
  });

  async function onSubmit(values: { name: string; email: string; password: string; repeatPassword: string }) {
    // Only send name, email, password to signUp
    const { name, email, password } = values;
    await signUp({ name, email, password });
  }

  if (isDataLoading) {
    return null;
  }

  if (isError && error?.["response"]?.status === 404) {
    return <Error404 />;
  }

  return (
    <Container size={420} className={classes.container}>
      <Box p="xl" className={classes.containerBox}>
        <Title order={2} ta="center" fw={500} mb="md">
          {t("Register")}
        </Title>

        <SsoLogin />

        {!data?.enforceSso && (
          <Stack align="stretch" justify="center" gap="xl">
            <form onSubmit={form.onSubmit(onSubmit)}>
              <TextInput
                id="name"
                type="text"
                label={t("Name")}
                placeholder={t("Alexandru POPESCU (234567)")}
                description={t(
                  "Enter your full name, exactly as it appears on teams. This is required for identity verification and to ensure you are added to the correct workspace.",
                )}
                variant="filled"
                {...form.getInputProps("name")}
              />
              <TextInput
                id="email"
                type="email"
                label={t("Email")}
                placeholder="email@stud.acs.upb.ro"
                description={t(
                  "Use your UPB email address to create your account. No other email domains are allowed except those ending in upb.ro.",
                )}
                variant="filled"
                mt="md"
                {...form.getInputProps("email")}
              />
              <PasswordInput
                label={t("Password")}
                placeholder={t("Your password")}
                variant="filled"
                mt="md"
                {...form.getInputProps("password")}
              />
              <PasswordInput
                label={t("Repeat password")}
                placeholder={t("Repeat your password")}
                variant="filled"
                mt="md"
                {...form.getInputProps("repeatPassword")}
              />
              <Button type="submit" fullWidth mt="xl" loading={isLoading}>
                {t("Sign Up")}
              </Button>

              <Group justify="flex-end" mt="sm">
                <Anchor
                  to={APP_ROUTE.AUTH.LOGIN}
                  component={Link}
                  underline="never"
                  size="sm"
                >
                  {t("Already have an account?")}
                </Anchor>
              </Group>
            </form>
          </Stack>
        )}
      </Box>
    </Container>
  );
}
