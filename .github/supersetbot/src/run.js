#!/usr/bin/env node

import supersetbot from './index.js';

supersetbot.runCommandFromGithubAction('@supersetbot label "label with spaces" --issue 400 ');
