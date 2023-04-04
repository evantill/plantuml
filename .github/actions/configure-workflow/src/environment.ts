import tsEnv from '@lpgera/ts-env'

export class Environment {
  readonly eventName: string
  readonly eventAction: string
  readonly refType: string
  readonly ref: string
  readonly actor: string
  readonly repositoryOwner: string

  constructor(
    eventName: string,
    eventAction: string,
    refType: string,
    ref: string,
    actor: string,
    repositoryOwner: string
  ) {
    this.eventName = eventName
    this.eventAction = eventAction
    this.refType = refType
    this.ref = ref
    this.actor = actor
    this.repositoryOwner = repositoryOwner
  }

  static load(): Environment {
    const eventName: string = tsEnv.stringOrThrow('GITHUB_EVENT_NAME')
    const eventAction: string = tsEnv.stringOrThrow('EVENT_ACTION')
    const refType: string = tsEnv.stringOrThrow('REF_TYPE')
    const ref: string = tsEnv.stringOrThrow('REF')
    const actor: string = tsEnv.stringOrThrow('ACTOR')
    const repositoryOwner: string = tsEnv.stringOrThrow('GITHUB_REPOSITORY_OWNER')
    return new Environment(eventName, eventAction, refType, ref, actor, repositoryOwner)
  }
}
