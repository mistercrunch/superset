#!/bin/bash
set -e
git fetch origin master:master
git diff master... | flake8 --diff
