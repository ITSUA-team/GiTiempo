import { describe, expect, it } from 'vitest';

import {
  extractGitHubIssueTitle,
  parseGitHubIssueUrl,
  resolveGitHubIssueContext,
} from './github-context';

describe('github issue context', () => {
  it('parses supported GitHub issue URLs', () => {
    expect(
      parseGitHubIssueUrl('https://github.com/octo/repo/issues/184'),
    ).toEqual({
      githubRepo: 'octo/repo',
      issueNumber: 184,
      surface: 'issue-page',
    });
  });

  it('parses supported GitHub Projects issue pane URLs without treating the URL project number as a node ID', () => {
    const withView = parseGitHubIssueUrl(
      'https://github.com/orgs/octo/projects/7/views/1?pane=issue&itemId=192662239&issue=octo|repo|184',
    );
    expect(withView).toEqual({
      githubRepo: 'octo/repo',
      issueNumber: 184,
      surface: 'project-issue-pane',
    });
    expect(withView).not.toHaveProperty('githubProjectId');

    const withoutView = parseGitHubIssueUrl(
      'https://github.com/orgs/octo/projects/7?pane=issue&itemId=192662239&issue=octo|repo|184',
    );
    expect(withoutView).toEqual({
      githubRepo: 'octo/repo',
      issueNumber: 184,
      surface: 'project-issue-pane',
    });
    expect(withoutView).not.toHaveProperty('githubProjectId');
  });

  it('rejects unsupported pull request and project-list URLs', () => {
    expect(
      parseGitHubIssueUrl('https://github.com/octo/repo/pull/184'),
    ).toBeNull();
    expect(
      parseGitHubIssueUrl(
        'https://github.com/orgs/octo/projects?pane=issue&issue=octo|repo|184',
      ),
    ).toBeNull();
  });

  it('rejects malformed URL strings without throwing', () => {
    expect(parseGitHubIssueUrl('not-a-url')).toBeNull();
  });

  it('rejects malformed GitHub Projects issue pane URLs', () => {
    expect(
      parseGitHubIssueUrl(
        'https://github.com/orgs/octo/projects/7/views/1?pane=details&issue=octo|repo|184',
      ),
    ).toBeNull();
    expect(
      parseGitHubIssueUrl(
        'https://github.com/orgs/octo/projects/7/views/1?pane=issue',
      ),
    ).toBeNull();
    expect(
      parseGitHubIssueUrl(
        'https://github.com/orgs/octo/projects/7/views/1?pane=issue&issue=octo|repo|not-a-number',
      ),
    ).toBeNull();
    expect(
      parseGitHubIssueUrl(
        'https://github.com/orgs/octo/projects/7/views?pane=issue&issue=octo|repo|184',
      ),
    ).toBeNull();
  });

  it('extracts issue titles from supported page selectors', () => {
    document.body.innerHTML =
      '<h1 class="js-issue-title">Improve reports filters</h1>';

    expect(extractGitHubIssueTitle(document)).toBe('Improve reports filters');
  });

  it('rejects document titles when the issue heading is unavailable', () => {
    document.body.innerHTML = '<div></div>';
    document.title =
      'Improve reports filters · Issue #184 · octo/repo · GitHub';

    expect(extractGitHubIssueTitle(document)).toBeNull();
  });

  it('returns an error context when a supported issue page is missing a title', () => {
    document.body.innerHTML = '<div></div>';
    document.title = '';

    expect(
      resolveGitHubIssueContext(
        document,
        'https://github.com/octo/repo/issues/184',
      ),
    ).toEqual({
      kind: 'error',
      message: 'We could not detect the GitHub issue title on this page.',
    });
  });

  it('resolves Projects pane context with a canonical direct issue URL', () => {
    document.body.innerHTML =
      '<section role="dialog"><div id="issue-viewer-sticky-header"><a href="https://github.com/octo/repo/issues/184">#184</a><h1 class="js-issue-title">Improve reports filters</h1></div></section>';

    expect(
      resolveGitHubIssueContext(
        document,
        'https://github.com/orgs/octo/projects/7?pane=issue&issue=octo|repo|184',
      ),
    ).toEqual({
      githubRepo: 'octo/repo',
      issueNumber: 184,
      issueTitle: 'Improve reports filters',
      issueUrl: 'https://github.com/octo/repo/issues/184',
      kind: 'supported',
      surface: 'project-issue-pane',
    });
  });
  it.each([
    'https://github.com/octo/repo/issues/0',
    'https://github.com/octo/repo/issues/9007199254740992',
    'https://github.com/octo/repo/issues/184/comments',
    'https://github.com/orgs/octo/projects/7?pane=issue&issue=octo|repo|1e3',
    'https://github.com/orgs/octo/projects/7?pane=issue&issue=octo|repo|9007199254740992',
    'https://example.com/octo/repo/issues/184',
    'http://github.com/octo/repo/issues/184',
    'https://user@github.com/octo/repo/issues/184',
  ])('rejects invalid issue identity %s', (url) => {
    expect(parseGitHubIssueUrl(url)).toBeNull();
  });

  it('canonicalizes query and fragment without transmitting them', () => {
    document.body.innerHTML =
      '<link rel="canonical" href="https://github.com/octo/repo/issues/184"><h1 class="js-issue-title">Current issue</h1>';
    expect(
      resolveGitHubIssueContext(
        document,
        'https://github.com/octo/repo/issues/184?secret=value#comment',
      ),
    ).toMatchObject({
      kind: 'supported',
      issueUrl: 'https://github.com/octo/repo/issues/184',
    });
  });

  it('resolves a direct issue from GitHub\'s rendered body-header identity without a head canonical', () => {
    document.head.innerHTML = '';
    document.body.innerHTML = `
      <div data-testid="issue-header">
        <h1><bdi data-testid="issue-title">Current issue</bdi><span>&nbsp;#184</span></h1>
      </div>
      <a data-testid="issue-body-header-link" href="https://github.com/octo/repo/issues/184#issue-123">Opened</a>
    `;

    expect(
      resolveGitHubIssueContext(
        document,
        'https://github.com/octo/repo/issues/184',
      ),
    ).toMatchObject({ kind: 'supported', issueTitle: 'Current issue' });
  });

  it('uses a matching rendered issue header over a stale head canonical after SPA navigation', () => {
    document.head.innerHTML =
      '<link rel="canonical" href="https://github.com/octo/repo/issues/183">';
    document.body.innerHTML = `
      <div data-testid="issue-header">
        <h1><bdi data-testid="issue-title">Current issue</bdi><span>&nbsp;#184</span></h1>
      </div>
      <a data-testid="issue-body-header-link" href="https://github.com/octo/repo/issues/184#issue-123">Opened</a>
    `;

    expect(
      resolveGitHubIssueContext(
        document,
        'https://github.com/octo/repo/issues/184',
      ),
    ).toMatchObject({ kind: 'supported', issueTitle: 'Current issue' });
  });

  it('accepts GitHub\'s nested issue number alongside authenticated header actions', () => {
    document.head.innerHTML = '';
    document.body.innerHTML = `
      <div data-testid="issue-header">
        <h1>
          <bdi data-testid="issue-title">external test isue</bdi>
          <span class="d-inline-flex flex-items-center gap-1">
            <span class="issueNumberText__ZPJKLj">&nbsp;#1</span>
            <button aria-label="Edit issue title" data-testid="edit-issue-title-button" type="button">
              <svg aria-hidden="true"></svg>
            </button>
            <span data-component="Tooltip" role="tooltip" aria-hidden="true" popover="auto">Edit issue title</span>
          </span>
        </h1>
      </div>
      <a data-testid="issue-body-header-link" href="https://github.com/My-test-org-for-clock/external-test-repo/issues/1#issue-5828174771">Opened</a>
    `;

    expect(
      resolveGitHubIssueContext(
        document,
        'https://github.com/My-test-org-for-clock/external-test-repo/issues/1',
      ),
    ).toMatchObject({ kind: 'supported', issueTitle: 'external test isue' });
  });

  it('rejects a rendered issue body link when its header number or identity is stale', () => {
    document.head.innerHTML =
      '<link rel="canonical" href="https://github.com/octo/repo/issues/184">';
    document.body.innerHTML = `
      <div data-testid="issue-header">
        <h1><bdi data-testid="issue-title">Previous issue</bdi><span>&nbsp;#183</span></h1>
      </div>
      <a data-testid="issue-body-header-link" href="https://github.com/octo/repo/issues/184#issue-123">Opened</a>
    `;

    expect(
      resolveGitHubIssueContext(
        document,
        'https://github.com/octo/repo/issues/184',
      ).kind,
    ).toBe('error');

    document.querySelector('[data-testid="issue-header"] span')!.textContent =
      ' #184';
    document
      .querySelector('[data-testid="issue-body-header-link"]')!
      .setAttribute('href', 'https://github.com/octo/repo/issues/183#issue-123');

    expect(
      resolveGitHubIssueContext(
        document,
        'https://github.com/octo/repo/issues/184',
      ).kind,
    ).toBe('error');
  });

  it('does not treat an issue number in the title as the rendered header number', () => {
    document.head.innerHTML = '';
    document.body.innerHTML = `
      <div data-testid="issue-header">
        <h1><bdi data-testid="issue-title">#184</bdi><span>&nbsp;#183</span></h1>
      </div>
      <a data-testid="issue-body-header-link" href="https://github.com/octo/repo/issues/184#issue-123">Opened</a>
    `;

    expect(
      resolveGitHubIssueContext(
        document,
        'https://github.com/octo/repo/issues/184',
      ).kind,
    ).toBe('error');
  });

  it('rejects stale declared issue identity and recovers when its DOM updates', () => {
    document.head.innerHTML = '';
    document.body.innerHTML =
      '<link rel="canonical" href="https://github.com/octo/repo/issues/183"><h1 class="js-issue-title">Previous issue</h1>';
    expect(
      resolveGitHubIssueContext(
        document,
        'https://github.com/octo/repo/issues/184',
      ).kind,
    ).toBe('error');
    document
      .querySelector('link')!
      .setAttribute('href', 'https://github.com/octo/repo/issues/184');
    document.querySelector('h1')!.textContent = 'Current issue';
    expect(
      resolveGitHubIssueContext(
        document,
        'https://github.com/octo/repo/issues/184',
      ),
    ).toMatchObject({ kind: 'supported', issueTitle: 'Current issue' });
  });

  it('never uses board headings outside the current pane', () => {
    document.body.innerHTML =
      '<h1 class="js-issue-title">Board title</h1><section role="dialog"><div id="issue-viewer-sticky-header"><a href="https://github.com/octo/repo/issues/184">#184</a>Loading</div></section>';
    document.title = 'Board title';
    expect(
      resolveGitHubIssueContext(
        document,
        'https://github.com/orgs/octo/projects/7?pane=issue&issue=octo|repo|184',
      ).kind,
    ).toBe('error');
    document
      .querySelector('section')!
      .insertAdjacentHTML(
        'beforeend',
        '<h1 class="js-issue-title">Actual issue</h1>',
      );
    expect(
      resolveGitHubIssueContext(
        document,
        'https://github.com/orgs/octo/projects/7?pane=issue&issue=octo|repo|184',
      ),
    ).toMatchObject({
      issueTitle: 'Actual issue',
      issueUrl: 'https://github.com/octo/repo/issues/184',
    });
  });

  it.each(['issue-page', 'project-issue-pane'] as const)(
    'rejects unbound retained titles on %s until DOM identity arrives',
    (surface) => {
      document.head.innerHTML = '';
      document.body.innerHTML =
        surface === 'issue-page'
          ? '<h1 class="js-issue-title">Retained issue</h1>'
          : '<section role="dialog"><div id="issue-viewer-sticky-header"><h1 class="js-issue-title">Retained issue</h1></div></section>';
      const url =
        surface === 'issue-page'
          ? 'https://github.com/octo/repo/issues/185'
          : 'https://github.com/orgs/octo/projects/7?pane=issue&issue=octo|repo|185';
      expect(resolveGitHubIssueContext(document, url).kind).toBe('error');
      if (surface === 'issue-page')
        document.head.innerHTML =
          '<link rel="canonical" href="https://github.com/octo/repo/issues/185">';
      else
        document
          .getElementById('issue-viewer-sticky-header')!
          .insertAdjacentHTML(
            'afterbegin',
            '<a href="https://github.com/octo/repo/issues/185">#185</a>',
          );
      document.querySelector('h1')!.textContent = 'Current issue';
      expect(resolveGitHubIssueContext(document, url)).toMatchObject({
        kind: 'supported',
        issueTitle: 'Current issue',
      });
    },
  );
});
