export const PR_FIELDS_FRAGMENT = `
  fragment PRFields on PullRequest {
    id
    number
    title
    url
    state
    isDraft
    mergeable
    createdAt
    updatedAt
    headRefName
    baseRefName
    repository {
      nameWithOwner
      url
    }
    author {
      login
      avatarUrl
    }
    reviewRequests(first: 10) {
      nodes {
        requestedReviewer {
          ... on User { login }
          ... on Team { name }
        }
      }
    }
    reviews(last: 30) {
      nodes {
        author { login }
        state
        body
        createdAt
        comments(first: 10) {
          nodes {
            body
            createdAt
            url
            author { login }
          }
        }
      }
    }
    reviewThreads(first: 50) {
      nodes {
        isResolved
        comments(first: 10) {
          nodes {
            body
            createdAt
            url
            author { login }
          }
        }
      }
    }
    comments(last: 20) {
      nodes {
        body
        createdAt
        url
        author { login }
      }
    }
    commits(last: 1) {
      nodes {
        commit {
          statusCheckRollup {
            state
            contexts(first: 30) {
              nodes {
                ... on CheckRun {
                  name
                  status
                  conclusion
                  detailsUrl
                  completedAt
                  checkSuite {
                    id
                    databaseId
                  }
                }
                ... on StatusContext {
                  context
                  state
                  targetUrl
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const PR_DASHBOARD_QUERY = `
  ${PR_FIELDS_FRAGMENT}

  query PRDashboard {
    authored: search(query: "is:open is:pr author:@me archived:false", type: ISSUE, first: 30) {
      nodes {
        ... on PullRequest {
          ...PRFields
        }
      }
    }
    reviewRequested: search(query: "is:open is:pr review-requested:@me archived:false", type: ISSUE, first: 30) {
      nodes {
        ... on PullRequest {
          ...PRFields
        }
      }
    }
  }
`;

export const VIEWER_QUERY = `
  query Viewer {
    viewer {
      login
      avatarUrl
    }
  }
`;
