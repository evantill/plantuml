import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  PullRequestEvent,
  PushEvent,
  ReleaseEvent,
  WorkflowDispatchEvent
} from '@octokit/webhooks-types'
import {Environment} from './environment'
import {dedent} from 'ts-dedent'
import {JavaVersionParser} from './JavaVersionParser'
import {wait} from './wait'

function debugInfo(env: Environment): void {
  core.startGroup('Debug Info')
  core.info(dedent`
		GITHUB_EVENT_NAME       : '${env.eventName}'
		EVENT_ACTION            : '${env.eventAction}'
		REF_TYPE                : '${env.refType}'
		REF                     : '${env.ref}'
		ACTOR                   : '${env.actor}'
		GITHUB_REPOSITORY_OWNER : '${env.repositoryOwner}'
		`)
  core.endGroup()
}

interface WorkflowConfiguration {
  do_release: boolean
  do_snapshot_release: boolean
  pom_version?: string
}

function configureWorkflow(): WorkflowConfiguration {
  const env = Environment.load()
  debugInfo(env)
  if (
    env.eventName === 'create' &&
    env.refType === 'tag' &&
    env.ref.startsWith('v') &&
    (env.actor === 'arnaudroques' || env.actor === github.context.repo.owner)
  ) {
    const do_release = true
    const do_snapshot_release = false
    //pom_version is the tag without the 'v' prefix
    const pom_version = env.ref.replace('/^v/', '')
    const message = dedent`
      do_release=${do_release}
      pom_version=${pom_version}
    `
    core.notice(message, {title: `This run will release '${env.ref}'`})
    return {do_release, do_snapshot_release, pom_version}
  } else if (
    /push|workflow_dispatch/.test(env.eventName) &&
    env.ref === 'refs/heads/master' &&
    env.actor === 'arnaudroques'
  ) {
    const do_release = false
    const do_snapshot_release = true
    core.notice('', {title: 'This run will release a snapshot'})

    const parser = new JavaVersionParser()
    const {major,minor,fix}=parser.parse()

    //pom_version is taken from Version_Snapshot.java
    const pom_version = `${major}.${minor}.${fix}-SNAPSHOT`
    return {do_release, do_snapshot_release, pom_version}
  } else {
    return {do_release: false, do_snapshot_release: false}
  }
}


/*
      - name: Configure workflow
        id: config
        env:
          ACTOR: ${{ github.actor }}
          EVENT_ACTION: ${{ github.event.action }}
          REF_TYPE: ${{ github.event.ref_type }}
          REF: ${{ github.event.ref }}
        run: |

          # Do a release when a git tag starting with 'v' has been created by a suitable user.
          # (We match against github.repository_owner as a kludge so that forked repos can release themselves when testing the workflow)

          if [[ "${GITHUB_EVENT_NAME}" == "create" && "${REF_TYPE}" == "tag" && "${REF}" == v* && \
                ( "${ACTOR}" == "arnaudroques" || "${ACTOR}" == "${GITHUB_REPOSITORY_OWNER}" ) \
             ]]; then
            echo "::notice title=::This run will release '${REF}'"
            echo "do_release=true" >> $GITHUB_OUTPUT
            echo "pom_version=${REF#v}" >> $GITHUB_OUTPUT # pom_version is the tag without the 'v' prefix

          elif [[ "${GITHUB_EVENT_NAME}" =~ push|workflow_dispatch && "${REF}" == "refs/heads/master" && "${ACTOR}" == "arnaudroques" ]]; then
            echo "::notice title=::This run will release a snapshot"
            echo "do_snapshot_release=true" >> $GITHUB_OUTPUT
            V=$(perl -ne 'if (/return (\d{6,7});/) {$v=$1} if (/final int beta = (\d+);/) {$b=$1} END{print(substr($v, 0, 1),".", substr($v, 1, 4),"."); if ($b) {print(int(substr($v+1, 5)), "beta", $b);} else {print(int(substr($v, 5)))}}' src/net/sourceforge/plantuml/version/Version_Snapshot.java)
            echo "pom_version=$V-SNAPSHOT" >> $GITHUB_OUTPUT # pom_version is taken from Version_Snapshot.java

          else
            echo "This run will NOT make a release"
          fi
 */

async function run(): Promise<void> {
  try {
    const ms: string = core.getInput('milliseconds')
    core.debug(`Waiting ${ms} milliseconds ...`) // debug is only output if you set the secret `ACTIONS_STEP_DEBUG` to true

    core.debug(new Date().toTimeString())
    await wait(parseInt(ms, 10))
    core.debug(new Date().toTimeString())

    core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

function onPullRequestEvent(payload: PullRequestEvent) {
  switch (payload.action) {
    case 'labeled':
      console.log('pull request label ' + payload.label)
      break
    default:
      console.log('pull request action ' + payload.action)
  }
  console.info('pull request event:', payload)
}

function onWorkflowDispatchEvent(payload: WorkflowDispatchEvent): void {
  console.info('workflow dispatch event:', payload)
}

function onPushEvent(payload: PushEvent): void {
  console.info('push event:', payload)
}

function onReleaseEvent(payload: ReleaseEvent) {
  console.info('onReleaseEvent:', payload)

}

function handleEvent(): void {
  console.info(`eventName: ${github.context.eventName}`)
  switch (github.context.eventName) {
    case 'workflow_dispatch':
      onWorkflowDispatchEvent(github.context.payload as WorkflowDispatchEvent)
      break
    case 'push':
      onPushEvent(github.context.payload as PushEvent)
      break
    case 'pull_request':
      onPullRequestEvent(github.context.payload as PullRequestEvent)
      break
    // case "pull_request_target":
    // onPullRequestEvent(github.context.payload as PullRequestEvent)
    // break;
    case 'release':
      onReleaseEvent(github.context.payload as ReleaseEvent)
    default:
      break
  }
}

handleEvent()
run()
