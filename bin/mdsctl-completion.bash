#!/usr/bin/env bash

options="--configure --preset --workdir --quiet --help"
commands="bootstrap build install test open token forward unforward cli uninstall reinstall"

_mdsctl_complete() {
  local cur prev opts cmds
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"
  opts=${options}
  cmds=${commands}

  case ${cur} in
    -*) COMPREPLY=($(compgen -W "${opts}" -- ${cur})); return 0;;
    [a-z]* | '') COMPREPLY=($(compgen -W "${cmds}" -- ${cur})); return 0;;
  esac
}

complete -F _mdsctl_complete mdsctl
