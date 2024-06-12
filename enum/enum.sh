#!/bin/bash

# REPO="github/codeql-actions"
REPO="has2k1/plotnine"
echo "Repository: $REPO"
ACCESS=$(gh repo view --json visibility --jq '.visibility')
echo "Access: $ACCESS"
# for each workflow in the repository (returned by gh workflow list --json id,name,path) echo the workflow name and path
for WORKFLOW in $(gh workflow list -R "$REPO" --json id,name,path --jq '.[] | @base64'); do
	ID=$(echo "$WORKFLOW" | base64 --decode | jq -r '.id')
	NAME=$(echo "$WORKFLOW" | base64 --decode | jq -r '.name')
	WPATH=$(echo "$WORKFLOW" | base64 --decode | jq -r '.path')

	echo "ID: $ID, Name: $NAME, Path: $WPATH"

	LAST_RUN_ID=$(gh run list -R "$REPO" --limit 1 --workflow "$ID" --json databaseId,event,headBranch,name --jq ".[0].databaseId")

	if [ -z "$LAST_RUN_ID" ]; then
		echo "No runs found for workflow $ID"
		continue
	fi
	echo "Last Run ID: $LAST_RUN_ID"

	FIRST_JOB_ID=$(gh run view "$LAST_RUN_ID" -R "$REPO" --json jobs --jq ".jobs[0].databaseId")

	echo "Job ID: $FIRST_JOB_ID"

	LOG=$(gh run view --log --job="$FIRST_JOB_ID" -R "$REPO")

	SET_UP_JOB_LOG=$(echo -e "$LOG" | grep "Set up job" | grep -o '\d\+\.\d\+Z.*' | sed 's/[0-9]\{2\}\.[0-9]\{7\}Z //g')

	PERMISSIONS=$(echo -e "$SET_UP_JOB_LOG" | sed -n '/^##\[group\]GITHUB_TOKEN Permissions$/,/^##\[endgroup\].*/p' | sed '1d;$d' | tr '\n' ', ')

	echo "$PERMISSIONS"

	RUNNER=$(echo -e "$SET_UP_JOB_LOG" | sed 's/[0-9]\{2\}\.[0-9]\{7\}Z //g' | sed -n '/^##\[group\]Runner Image$/,/^##\[endgroup\].*/p' | sed '1d;$d' | tr '\n' ', ')

	echo $RUNNER
done
