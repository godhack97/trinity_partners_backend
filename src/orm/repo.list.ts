import * as repositories from './repositories';

export const repoList = createRepos();

function createRepos(): any[] {
  const repoList = [];
  for (const entity of Object.values(repositories)) {
    repoList.push(entity);
  }
  return repoList;
}
