import { parseArgsStringToArgv } from 'string-argv';
import Context from './context.js';
import getCLI from './cli.js';

export async function runCommandFromGithubAction(rawCommand, ghaContext, ghaGithubClient) {
  const envContext = new Context('GHA', ghaContext, ghaGithubClient);
  const cli = getCLI(envContext);

  // Make rawCommand look like argv
  const cmd = rawCommand.trim().replace('@supersetbot', 'supersetbot');
  const args = parseArgsStringToArgv(cmd);
  const resp = await cli.parseAsync(['node', ...args]);
}

const supersetbot = {
  runCommandFromGithubAction,
};

export default supersetbot;
