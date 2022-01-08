import { context, getOctokit } from '@actions/github';
import { debug, error, getInput, setFailed, setOutput } from '@actions/core';

interface PullRequest {
  title: string;
  body: string;
  number: number;
  labels: string;
  assignees: string[];
}

async function run(): Promise<void> {
  try {
    const pull = await getMergedPullRequest(
      getInput('github_token'),
      context.repo.owner,
      context.repo.repo,
      context.sha
    );
    if (!pull) {
      debug('pull request not found');
      return;
    }

    setOutput('title', pull.title);
    setOutput('body', pull.body);
    setOutput('number', pull.number);
    setOutput('labels', pull.labels);
    setOutput('assignees', pull.assignees?.join('\n'));
  } catch (e) {
    if (!(e instanceof Error)) {
      throw e;
    }
    error(e);
    setFailed(e.message);
  }
}

async function getMergedPullRequest(
  githubToken: string,
  owner: string,
  repo: string,
  sha: string
): Promise<PullRequest | null> {
  const client = getOctokit(githubToken);

  const resp = await client.rest.pulls.list({
    owner,
    repo,
    sort: 'updated',
    direction: 'desc',
    state: 'closed',
    // eslint-disable-next-line camelcase
    per_page: 100
  });

  const pull = resp.data.find(p => p.merge_commit_sha === sha);
  if (!pull) {
    return null;
  }

  return {
    title: pull.title,
    body: pull.body ?? '',
    number: pull.number,
    labels: JSON.stringify(pull.labels),
    assignees: pull.assignees?.map(a => a.login) ?? []
  };
}

run();
