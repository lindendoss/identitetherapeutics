import { createRouter } from "./middleware";
import { vaultAuthRouter } from "./vault-auth-router";
import { vaultFilesRouter } from "./vault-files-router";
import { contactRouter } from "./contact-router";
import { vaultRouter } from "./vault-router";

export const appRouter = createRouter({
  vaultAuth: vaultAuthRouter,
  vaultFiles: vaultFilesRouter,
  vault: vaultRouter,
  contact: contactRouter,
});

export type AppRouter = typeof appRouter;
