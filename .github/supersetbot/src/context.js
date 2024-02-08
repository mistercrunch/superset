import { Octokit } from '@octokit/rest';

class Context {
  constructor(source, ghaContext = null, ghaGithubClient = null) {

    this.source = source;
    this.ghaContext = ghaContext;
    this.ghaGithubClient = ghaGithubClient;
    this.repo = process.env.GITHUB_REPOSITORY;
    this.options = {};

    if (source === 'CLI') {
      if (!process.env.GITHUB_TOKEN) {
        const msg = 'GITHUB_TOKEN is not set. Please set the GITHUB_TOKEN environment variable.';
        this.logError(msg);
        process.exit(1);
      }
      //this.github = new Octokit({ auth: `token ${process.env.GITHUB_TOKEN}` });
    } else if (source === 'GHA') {
      if (ghaContext?.issue?.number) {
        process.env.GITHUB_ISSUE_NUMBER = ghaContext.issue.number;
      }
      process.env.GITHUB_ACTOR = ghaContext?.actor || 'UNKNOWN';
    }

    this.github = new Octokit({ auth: `token ${process.env.GITHUB_TOKEN}` });
    this.errorLogs = [];
    this.logs = [];
  }
  requireOption(optionName, options) {
    const optionValue = options[optionName];
    if (optionValue === undefined || optionValue === null) {
      this.logError(`🔴 ERROR: option [${optionName}] is required`);
      process.exit(1);
    }
  }
  requireOptions(optionNames, options) {
    optionNames.forEach((optionName) => {
      this.requireOption(optionName, options);
    });
  }
  log(msg) {
    console.log(msg);
    this.logs.push(msg);
  }
  processOptions(command, requiredOptions) {
    const raw = command.parent?.rawArgs;
    this.command = '???';
    if (raw) {
      this.command = raw.map(s => s.includes(' ') ? `"${s}"` : s).join(' ').replace('node ', '');
    }
    this.options = { ...command.opts(), ...command.parent.opts() };
    this.requireOptions(requiredOptions, this.options);
    this.issueNumber = this.options.issue;

    if (this.source === 'GHA') {
      this.options.actor = process.env.GITHUB_ACTOR || 'UNKNOWN';
      this.options.repo = process.env.GITHUB_REPOSITORY;
    }

    return this.options;
  }
  logError(msg) {
    console.error(msg);
    this.errorLogs.push(msg);
  }

  preCommand() {
  }

  commandWrapper({func, successMsg, errorMsg = null, verbose = false, exitOnError = true}) {
    return async (...args) => {
      this.preCommand();
      let resp;
      try {
        resp = await func(...args);
      } catch (error) {
        if (errorMsg) {
          this.logError(`🔴 ERROR: ${errorMsg}`);
        } else {
          this.logError(`🔴 ERROR: ${error}`);
        }
        if (exitOnError) {
          process.exit(1);
        }
      }
      if (successMsg) {
        this.log(`🟢 ${successMsg}`);
      }
      await this.onDone();
      return resp;
    };
  }
  reconstructCommand() {
  }
  async onDone(msg) {
    if (this.source === 'GHA') {
      const [owner, repo] = this.repo.split('/')
      let body = '';
      body += `> \`${this.command}\`\n\n`
      body += "```\n"
      body += this.logs.join('\n')
      body += this.errorLogs.join('\n')
      body += "```"
      await this.github.rest.issues.createComment({
        owner,
        repo,
        body,
        issue_number: this.issueNumber,
      });
    }
  }

}

export default Context;
