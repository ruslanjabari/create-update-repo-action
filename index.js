const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function addCollaboratorWithRetry(config) {
  let retries = 3;
  while (retries > 0) {
    try {
      await axios(config);
      return;
    } catch (error) {
      console.log(`Attempt to add collaborator failed: ${error.message}`);
      retries--;
      if (retries === 0) {
        throw error;
      }
      await delay(5000); // Wait before retrying
    }
  }
}

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

    await delay(5000); // Wait for the repo to be created
    console.log(`Target organization: ${targetOrgName}`);
    console.log(`Repository name: ${issueTitle}`);
    console.log(`Collaborator username: ${issueCreator}`);

    // Step 3: Add the issue creator as a collaborator
    const addCollaboratorURL = `https://api.github.com/repos/${targetOrgName}/${issueTitle}/collaborators/${issueCreator}`;
    console.log("Adding collaborator with URL:", addCollaboratorURL);

    const addCollaboratorConfig = {
      method: "put",
      url: addCollaboratorURL,
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `token ${ghToken}`,
        "Content-Type": "application/json",
      },
      data: { permission: "push" },
    };

    await addCollaboratorWithRetry(addCollaboratorConfig);
    console.log(`Added ${issueCreator} as a collaborator to ${issueTitle}`);

    // Step 4: Close the issue
    const closeIssueURL = `https://api.github.com/repos/${targetOrgName}/${github.context.repo.repo}/issues/${github.context.issue.number}`;
    console.log("Closing issue with URL:", closeIssueURL);

    const closeIssueConfig = {
      method: "patch",
      url: closeIssueURL,
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
