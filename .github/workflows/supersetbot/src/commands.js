import { ORG_LIST } from './metadata.js';
/* eslint-disable no-shadow */

function unPackRepo(longRepo) {
  const [owner, repo] = longRepo.split('/');
  return { repo, owner };
}

// -------------------------------------
// Individual commands
// -------------------------------------
export async function label(repo, issueNumber, label, context) {
  await context.github.rest.issues.addLabels({
    ...unPackRepo(repo),
    issue_number: issueNumber,
    labels: [label],
  });
}

export async function unlabel(repo, issueNumber, label, context) {
  await context.github.rest.issues.removeLabel({
    ...unPackRepo(repo),
    issue_number: issueNumber,
    name: label,
  });
}

export async function assignOrgLabel(repo, issueNumber, context) {
  const issue = await context.github.rest.issues.get({
    ...unPackRepo(repo),
    issue_number: issueNumber,
  });

  const username = issue.data.user.login;
  const orgs = await context.github.orgs.listForUser({ username });
  const orgNames = orgs.data.map((v) => v.login);

  // get list of matching github orgs
  const matchingOrgs = orgNames.filter((org) => ORG_LIST.includes(org));
  if (matchingOrgs.length) {
    context.github.rest.issues.addLabels({
      ...unPackRepo(repo),
      issue_number: issueNumber,
      labels: matchingOrgs,
    });
  }
}
