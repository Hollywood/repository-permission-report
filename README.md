# Repository Permission Report

## Overview

This Node app will run some queries using GitHub's [Octokit](https://github.com/octokit/rest.js) library to compile a `.csv` file with the following information:

| Org | Repo | Team | User | Permission | Type |
| ---- | ---- | ---- | ---- | ---- | ---- |
| hollywood | hollywood-personal-repo | N/A | hollywood | owner | PERSONAL |
| Project1 | project-1-admin-repo | admin-team | hollywood | admin | MEMBER |
| Project2 | project-2-repo | dev-team | hollywood | push | MEMBER |
| Project2 | project-2-repo | dev-team | another-dev | push | MEMBER |
| Project2 | project-2-repo | N/A | outside-collaborator-dev | push | COLLAB |

## Prerequisites

- A [Personal Access Token](https://help.github.com/articles/authorizing-a-personal-access-token-for-use-with-a-saml-single-sign-on-organization/) for an account that has access to view all Organizations requested within the document as well as the members of that org. The following scopes should be selected on the PAT:
  - repo (top level)
  - admin:org (top level)

- A `.env` file with the following values:
  - GHE_TOKEN - The value of your Personal Access Token
  - GHE_URL - The URI of your GHE install with the api route appended
    - https://YOUR_DOMAIN/api/v3

## Generating the Report

A `.csv` file will be generated in the top level of the folder the project is contained in with the information gathered from the API calls. To run the application and generate the report, navigate to the project folder inside the terminal and type `node index.js`.
  