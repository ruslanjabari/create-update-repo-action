const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");

async function run() {
  try {
    const ghToken = core.getInput("org-admin-token");
    const issueTitle = github.context.payload.issue.title;
    const issueCreator = github.context.payload.issue.user.login;
    const targetOrgName = github.context.repo.owner;

    // Step 1: Create the repository
    const createRepoData = JSON.stringify({
      name: issueTitle,
      private: true,
      visibility: "private",
    });

    const createRepoConfig = {
      method: "post",
      url: `https://api.github.com/orgs/${targetOrgName}/repos`,
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `token ${ghToken}`,
        "Content-Type": "application/json",
      },
      data: createRepoData,
    };

    const repoResponse = await axios(createRepoConfig);
    console.log(`Repo ${issueTitle} created successfully!`);
    core.setOutput(
      "repo-url",
      `https://github.com/${targetOrgName}/${issueTitle}`
    );

    // Step 2: Add the issue creator as a collaborator
    const addCollaboratorConfig = {
      method: "put",
      url: `https://api.github.com/repos/${targetOrgName}/${issueTitle}/collaborators/${issueCreator}`,
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `token ${ghToken}`,
        "Content-Type": "application/json",
      },
      data: { permission: "push" },
    };

    await axios(addCollaboratorConfig);
    console.log(`Added ${issueCreator} as a collaborator to ${issueTitle}`);

    // Step 3: Close the issue
    const closeIssueConfig = {
      method: "patch",
      url: `https://api.github.com/repos/${targetOrgName}/${github.context.repo.repo}/issues/${github.context.issue.number}`,
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `token ${ghToken}`,
        "Content-Type": "application/json",
      },
      data: { state: "closed" },
    };

    await axios(closeIssueConfig);
    console.log(`Closed issue #${github.context.issue.number}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
