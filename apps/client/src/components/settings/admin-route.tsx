import { Navigate, Outlet } from "react-router-dom";
import useUserRole from "@/hooks/use-user-role.tsx";
import { useAtom } from "jotai";
import { currentUserAtom } from "@/features/user/atoms/current-user-atom.ts";
import APP_ROUTE from "@/lib/app-route.ts";

export default function AdminRoute() {
  const { isAdmin } = useUserRole();
  const [currentUser] = useAtom(currentUserAtom);

  // wait for the user to load before deciding
  if (!currentUser?.user) {
    return null;
  }

  return isAdmin ? <Outlet /> : <Navigate to={APP_ROUTE.HOME} replace />;
}
