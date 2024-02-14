import { program } from 'commander';
import * as commands from './commands.js';

export default function getCLI(envContext) {
  // Setting up top-level CLI options
  program
    .option('-v, --verbose', 'Output extra debugging information')
    .option('-r, --repo <repo>', 'The GitHub repo to use (ie: "apache/superset")', process.env.GITHUB_REPOSITORY)
    .option('-a, --actor <actor>', 'The actor', process.env.GITHUB_ACTOR);

  const issueOptionParams = ['-i, --issue <issue>', 'The issue number', process.env.GITHUB_ISSUE_NUMBER];

  program.command('label <label>')
    .description('Add a label to an issue or PR')
    .option(...issueOptionParams)
    .action(async function (label) {
      const opts = envContext.processOptions(this, ['issue', 'repo']);
      commands.label(opts.repo, opts.issue, label, envContext, opts.actor, opts.verbose);
    });

  program.command('unlabel <label>')
    .description('Remove a label from an issue or PR')
    .option(...issueOptionParams)
    .action(async function (label) {
      const opts = envContext.processOptions(this, ['issue', 'repo']);
      commands.unlabel(opts.repo, opts.issue, label, envContext, opts.actor, opts.verbose);
    });

  program.command('orglabel')
    .description('Add an org label based on the author')
    .option(...issueOptionParams)
    .action(async function () {
      const opts = envContext.processOptions(this, ['issue', 'repo']);
      const wrapped = envContext.commandWrapper({
        func: commands.assignOrgLabel,
        successMsg: 'SUCCESS: added the right labels',
        errorMsg: 'FAILED at stuff',
        verbose: opts.verbose,
      });
      await wrapped(opts.repo, opts.issue, envContext);
    });

  return program;
}
