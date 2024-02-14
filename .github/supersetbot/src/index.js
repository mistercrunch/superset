import { parseArgsStringToArgv } from 'string-argv';
import Context from './context.js';
import getCLI from './cli.js';

export async function runCommandFromGithubAction(rawCommand) {
  const envContext = new Context('GHA');
  const cli = getCLI(envContext);

  // Make rawCommand look like argv
  const cmd = rawCommand.trim().replace('@supersetbot', 'supersetbot');
  const args = parseArgsStringToArgv(cmd);
  await cli.parseAsync(['node', ...args]);
  envContext.onDone();
}

const supersetbot = {
  runCommandFromGithubAction,
};

export default supersetbot;
