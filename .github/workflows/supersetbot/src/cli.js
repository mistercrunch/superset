import { program } from 'commander';
import * as commands from './commands.js';

export default function getCLI(envContext) {
  // Setting up top-level CLI options
  program
    .option('-v, --verbose', 'Output extra debugging information')
    .option('-r, --repo', 'The GitHub repo to use (ie: "apache/superset")', (v) => v, process.env.GITHUB_REPOSITORY);

  const issueOptionParams = ['-i, --issue <issue>', 'The issue number', (v) => v, process.env.GITHUB_ISSUE_NUMBER];

  program.command('label <label>')
    .description('Add a label to an issue or PR')
    .option(...issueOptionParams)
    .action(async function (label) {
      const opts = envContext.processOptions(this, ['issue', 'repo']);
      const wrapped = envContext.commandWrapper(
        commands.label,
        `SUCCESS: label "${label}" added to issue ${opts.issue}`,
        null,
        opts.verbose);
      await wrapped(opts.repo, opts.issue, label, envContext);
    });

  program.command('unlabel <label>')
    .description('Add a label to an issue or PR')
    .option(...issueOptionParams)
    .action(async function (label) {
      const opts = envContext.processOptions(this, ['issue', 'repo']);
      const wrapped = envContext.commandWrapper(
        commands.unlabel,
        `SUCCESS: label "${label}" removed from issue ${opts.issue}`,
        opts.verbose);
      await wrapped(opts.repo, opts.issue, label, envContext);
    });

  program.command('orglabel')
    .description('Add an org label based on the author')
    .option(...issueOptionParams)
    .action(async function (commandOptions) {
      const opts = envContext.processOptions(this, ['issue', 'repo']);
      const wrapped = envContext.commandWrapper(
        commands.unlabel,
        'SUCCESS: added the right labels',
        opts.verbose);
      await wrapped(opts.repo, opts.issue, envContext);
    });

  return program;
}
