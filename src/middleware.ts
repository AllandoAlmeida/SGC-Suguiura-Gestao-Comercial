export { default } from "next-auth/middleware";

export const config = {
  // Protege todas as rotas exceto login, auth, assets e api de auth.
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
