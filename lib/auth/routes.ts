export type AppRouteDefinition = {
  path: string;
  label: string;
  description: string;
  visibility: "public" | "protected";
  includeInNavigation: boolean;
  permission: string | null;
};

const LOGOUT_ROUTE_PATH = "/logout";
const DB_BOOTSTRAP_ROUTE_PATH = "/db_bootstrap";

const APP_ROUTE_DEFINITIONS: AppRouteDefinition[] = [
  {
    path: "/",
    label: "Inicio",
    description: "Landing page principal.",
    visibility: "protected",
    includeInNavigation: true,
    permission: "/",
  },
  {
    path: "/db_bootstrap",
    label: "DB Bootstrap",
    description: "Bootstrap e diagnostico do banco.",
    visibility: "protected",
    includeInNavigation: true,
    permission: null,
  },
  {
    path: "/api/health",
    label: "Health API",
    description: "Endpoint de saude e readiness.",
    visibility: "protected",
    includeInNavigation: false,
    permission: "/api/health",
  },
  {
    path: "/login",
    label: "Login",
    description: "Entrada publica para autenticacao.",
    visibility: "public",
    includeInNavigation: false,
    permission: null,
  },
  {
    path: "/logout",
    label: "Logout",
    description: "Encerramento da sessao autenticada.",
    visibility: "protected",
    includeInNavigation: false,
    permission: null,
  },
  {
    path: "/admin/users",
    label: "Usuarios",
    description: "Administracao de usuarios.",
    visibility: "protected",
    includeInNavigation: true,
    permission: "/admin/users",
  },
  {
    path: "/admin/roles",
    label: "Roles",
    description: "Administracao de roles.",
    visibility: "protected",
    includeInNavigation: true,
    permission: "/admin/roles",
  },
  {
    path: "/relatorio-contabil",
    label: "Relatorio contabil",
    description: "Rota publica reservada para o relatorio contabil.",
    visibility: "public",
    includeInNavigation: false,
    permission: null,
  },
];

const NEXT_PUBLIC_PATH_PREFIXES = ["/_next", "/images"];
const NEXT_PUBLIC_EXACT_PATHS = ["/favicon.ico", "/robots.txt", "/sitemap.xml"];

function normalizePath(value: string) {
  if (!value) {
    return "/";
  }

  if (value === "/") {
    return value;
  }

  return value.replace(/\/+$/, "") || "/";
}

function matchesRoutePath(pathname: string, routePath: string) {
  const normalizedPathname = normalizePath(pathname);
  const normalizedRoutePath = normalizePath(routePath);

  if (normalizedRoutePath === "/") {
    return normalizedPathname === "/";
  }

  return (
    normalizedPathname === normalizedRoutePath ||
    normalizedPathname.startsWith(`${normalizedRoutePath}/`)
  );
}

export function normalizeRoutePermission(permission: string) {
  const trimmed = permission.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed === "*") {
    return trimmed;
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return normalizePath(withLeadingSlash);
}

export function normalizeRoutePermissions(permissions: readonly string[]) {
  return Array.from(
    new Set(
      permissions
        .map((permission) => normalizeRoutePermission(permission))
        .filter((permission): permission is string => Boolean(permission)),
    ),
  ).sort();
}

export function getAppRouteDefinitions() {
  return APP_ROUTE_DEFINITIONS.map((route) => ({ ...route }));
}

export function getNavigableProtectedRoutes() {
  return APP_ROUTE_DEFINITIONS.filter(
    (route) => route.visibility === "protected" && route.includeInNavigation,
  ).map((route) => ({ ...route }));
}

export function getNavigableRoutesForPermissions(permissions: readonly string[] | null | undefined) {
  if (!permissions?.length) {
    return [];
  }

  return getNavigableProtectedRoutes().filter((route) => hasRoutePermission(route.path, permissions));
}

export function getAssignableRoutePermissions() {
  return APP_ROUTE_DEFINITIONS.flatMap((route) =>
    route.visibility === "protected" && route.permission ? [route.permission] : [],
  );
}

export function isBootstrapRoute(pathname: string) {
  return matchesRoutePath(pathname, DB_BOOTSTRAP_ROUTE_PATH);
}

export function isLogoutRoute(pathname: string) {
  return matchesRoutePath(pathname, LOGOUT_ROUTE_PATH);
}

export function isAlwaysAllowedForAuthenticatedUser(pathname: string) {
  return isLogoutRoute(pathname);
}

export function isPublicRoute(pathname: string) {
  const normalizedPathname = normalizePath(pathname);

  if (NEXT_PUBLIC_EXACT_PATHS.includes(normalizedPathname)) {
    return true;
  }

  if (NEXT_PUBLIC_PATH_PREFIXES.some((prefix) => matchesRoutePath(normalizedPathname, prefix))) {
    return true;
  }

  return APP_ROUTE_DEFINITIONS.some(
    (route) => route.visibility === "public" && matchesRoutePath(normalizedPathname, route.path),
  );
}

export function hasRoutePermission(pathname: string, permissions: readonly string[]) {
  if (isPublicRoute(pathname)) {
    return true;
  }

  const normalizedPermissions = normalizeRoutePermissions(permissions);

  if (normalizedPermissions.includes("*")) {
    return true;
  }

  return normalizedPermissions.some((permission) => matchesRoutePath(pathname, permission));
}
