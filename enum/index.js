//import { Octokit } from "octokit";
const { Octokit } = require("octokit");

const owner = "hashicorp";
const repo = "terraform-provider-azurerm";
const octokit = new Octokit({});

var exec = require("child_process").exec;
function execute(command, callback) {
  exec(command, function (error, stdout, stderr) {
    callback(stdout);
  });
}

async function fetchWorkflows() {
  try {
    return await new Promise(async (resolve, reject) => {
      try {
        const response = await octokit.request(
          "GET /repos/{owner}/{repo}/actions/workflows",
          {
            owner: owner,
            repo: repo,
            headers: {
              "X-GitHub-Api-Version": "2022-11-28",
            },
          },
        );
        resolve(response.data.workflows);
      } catch (error) {
        reject("error");
        console.log(error);
      }
    });
  } catch (error) {
    console.log(error);
  }
}

async function fetchLastRunFor(workflow) {
  try {
    return await new Promise(async (resolve, reject) => {
      try {
        const response = await octokit.request(
          "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs",
          {
            owner: owner,
            repo: repo,
            workflow_id: workflow.id,
            headers: {
              "X-GitHub-Api-Version": "2022-11-28",
            },
          },
        );
        if (response.data.total_count == 0) {
          console.log("No runs found for workflow: " + workflow.name);
          return;
        }
        const last_run = response.data.workflow_runs[0];
        resolve(last_run);
      } catch (error) {
        reject("error");
        console.log(error);
      }
    });
  } catch (error) {
    console.log(error);
  }
}

async function fetchFirstJobFor(run) {
  try {
    return await new Promise(async (resolve, reject) => {
      try {
        const response = await octokit.request(
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
          {
            owner: owner,
            repo: repo,
            run_id: run.id,
            headers: {
              "X-GitHub-Api-Version": "2022-11-28",
            },
          },
        );
        if (response.data.total_count == 0) {
          console.log("No jobs found for run id: " + run.id);
          return;
        }
        resolve(response.data.jobs[0]);
      } catch (error) {
        reject("error");
        console.log(error);
      }
    });
  } catch (error) {
    console.log(error);
  }
}

function fetchJobLogFor(job, callback) {
  const cmd = `gh run view --log --job=${job.id} -R ${owner}/${repo} | grep "Set up job" | cut -f3 | cut -d ' ' -f2-`;
  execute(cmd, (log) => {
    var permissions = {};
    var runner = {};
    var in_perm_lines = false;
    var in_runner_lines = false;
    var secret_source = "";
    for (const line of log.split("\n")) {
      if (line == "##[group]GITHUB_TOKEN Permissions") {
        in_perm_lines = true;
        in_runner_lines = false;
      } else if (line == "##[group]Runner Image") {
        in_perm_lines = false;
        in_runner_lines = true;
      } else if (line == "##[endgroup]") {
        in_perm_lines = false;
        in_runner_lines = false;
      } else if (in_perm_lines) {
        const [key, value] = line.split(":");
        permissions[key.trim()] = value.trim();
      } else if (in_runner_lines) {
        const [key, value] = line.split(":");
        runner[key.trim()] = value.trim();
      } else if (line.startsWith("Secret source:")) {
        secret_source = line.split(":")[1].trim();
      }
    }
    callback({
      permissions: permissions,
      runner: runner,
      secret_source: secret_source,
    });
  });
}

const workflows = fetchWorkflows();
workflows.then((workflows) => {
  if (workflows === undefined) {
    console.error("No workflows found");
    return;
  }

  workflows.forEach((workflow) => {
    const run = fetchLastRunFor(workflow);
    run.then((run) => {
      const job = fetchFirstJobFor(run);
      job.then((job) => {
        fetchJobLogFor(job, (data) => {
          var result = {};
          result["workflow"] = workflow.name;
          result["run_id"] = run.id;
          result["job_id"] = job.id;
          result["permissions"] = data.permissions;
          result["runner"] = data.runner;
          result["secret_source"] = data.secret_source;
          console.log(result);
        });
      });
    });
  });
});
