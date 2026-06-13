// Shared Hono env type — set by auth middleware + workspace middleware in sequence
export type AppEnv = {
  Variables: {
    userId: string;
    workspaceId: string;
  };
};
