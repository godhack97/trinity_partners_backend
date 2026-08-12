import * as repositories from "./repositories";

export const repoList = Object.values(repositories).filter(
  (repository) => typeof repository === "function"
);