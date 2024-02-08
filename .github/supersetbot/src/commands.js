import { ORG_LIST, PROTECTED_LABEL_PATTERNS, COMMITTER_TEAM } from './metadata.js';
/* eslint-disable no-shadow */

function unPackRepo(longRepo) {
  const [owner, repo] = longRepo.split('/');
  return { repo, owner };
}

function isLabelProtected(label) {
  return PROTECTED_LABEL_PATTERNS.some(pattern => new RegExp(pattern).test(label));
}

async function checkIfUserInTeam(username, team, context, verbose) {
  const [org, team_slug] = team.split('/');
  const wrapped = context.commandWrapper({
    func: context.github.teams.getMembershipForUserInOrg,
    errorMsg: "User is not authorized to alter protected labels.",
    verbose,
  });
  const resp = await wrapped({
    org,
    team_slug,
    username,
  });
  return resp?.data?.state === 'active';
}

// -------------------------------------
// Individual commands
// -------------------------------------
export async function label(longRepo, issueNumber, label, context, actor = null, verbose = false) {
  if (actor && isLabelProtected(label)) {
    checkIfUserInTeam(actor, COMMITTER_TEAM, context, verbose);
  }
  const addLabelWrapped = context.commandWrapper({
    func: context.github.rest.issues.addLabels,
    successMsg:`SUCCESS: label "${label}" added to issue ${issueNumber}`,
    verbose,
  });
  await addLabelWrapped({
    ...unPackRepo(longRepo),
    issue_number: issueNumber,
    labels: [label],
  });
}

export async function unlabel(longRepo, issueNumber, label, context, actor = null, verbose = false) {
  if (actor && isLabelProtected(label)) {
    checkIfUserInTeam(actor, COMMITTER_TEAM, context, verbose);
  }
  const addLabelWrapped = context.commandWrapper({
    func: context.github.rest.issues.removeLabel,
    successMsg:`SUCCESS: label "${label}" removed from issue ${issueNumber}`,
    verbose,
  });
  await addLabelWrapped({
    ...unPackRepo(longRepo),
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
