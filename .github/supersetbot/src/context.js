import { Octokit } from '@octokit/rest';

class Context {
  constructor(source) {
    this.hasErrors = false;
    if (!process.env.GITHUB_TOKEN) {
      const msg = 'GITHUB_TOKEN is not set. Please set the GITHUB_TOKEN environment variable.';
      this.logError(msg);
    }
    this.github = new Octokit({ auth: `token ${process.env.GITHUB_TOKEN}` });

    this.source = source;
    this.repo = process.env.GITHUB_REPOSITORY;
    this.options = {};
    this.errorLogs = [];
    this.logs = [];
    this.hasError = false;
  }

  requireOption(optionName, options) {
    const optionValue = options[optionName];
    if (optionValue === undefined || optionValue === null) {
      this.logError(`🔴 ERROR: option [${optionName}] is required`);
      this.hasError = true;
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
      this.command = raw.map((s) => (s.includes(' ') ? `"${s}"` : s)).join(' ').replace('node ', '');
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
    this.hasErrors = true;
    console.error(msg);
    this.errorLogs.push(msg);
  }

  commandWrapper({
    func, successMsg, errorMsg = null, verbose = false,
  }) {
    return async (...args) => {
      let resp;
      try {
        resp = await func(...args);
        if (verbose) {
          console.log(resp);
        }
      } catch (error) {
        if (errorMsg) {
          this.logError(`🔴 ERROR: ${errorMsg}`);
        } else {
          this.logError(`🔴 ERROR: ${error}`);
        }
      }
      if (successMsg) {
        this.log(`🟢 ${successMsg}`);
      }
      return resp;
    };
  }

  async onDone() {
    if (this.source === 'GHA') {
      let body = '';
      body += `> \`${this.command}\`\n\n`;
      body += '```\n';
      body += this.logs.join('\n');
      body += this.errorLogs.join('\n');
      body += '```';

      const [owner, repo] = this.repo.split('/');
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
