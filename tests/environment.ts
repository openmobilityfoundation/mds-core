import { execSync } from 'child_process'

export const gitHash = () => {
  return execSync('git rev-parse --short HEAD').toString().trim()
}

export const gitBranch = () => {
  return execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
}

export const nodeVersion = () => {
  return execSync('node --version').toString().trim()
}

export const packageVersion = () => {
  // fixme: get package-version from env
  return "0.1.14";
}

export const isIsoDate = (s) => {
  return (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(s)) ? false : new Date(s).toISOString() == s;
}