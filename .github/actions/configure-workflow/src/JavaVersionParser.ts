import {readFileSync} from 'fs'

export interface JavaVersion {
  major: string
  minor: string
  fix: string
  dotted: string
}

interface VersionInfo {
  version: string
  beta: bigint
}

const defaultJavaFilePath = 'src/net/sourceforge/plantuml/version/Version_Snapshot.java'

export class JavaVersionParser {
  private readonly _javaFilePath

  constructor(javaFilePath: string = defaultJavaFilePath) {
    this._javaFilePath = javaFilePath
  }

  parse(): JavaVersion {
    const {version, beta} = this.extractVersionInfo()

    const major = version.substring(0, 1)
    const minor = version.substring(1, 5)
    let fix = version.substring(5)
    if (beta) {
      const nextNum = BigInt(fix) + BigInt(1)
      fix = `${nextNum}beta${beta}`
    }
    const dotted = `${major}.${minor}.${fix}`
    return {major, minor, fix, dotted}
  }

  private extractVersionInfo(): VersionInfo {
    const lines = this.readFile()

    const findVersion = /return (\d{6,7});/
    const findBeta = /final int beta = (\d+);/

    let version: string | undefined
    let beta: string | undefined

    lines.forEach(elem => {
      const matched_version = elem.match(findVersion)
      if (matched_version) {
        version = matched_version[1]
      }
      const matched_beta = elem.match(findBeta)
      if (matched_beta) {
        beta = matched_beta[1]
      }
    })
    if (!version || !beta) {
      throw new Error('error while extracting version and beta from Version_Snapshot.java')
    }
    return {version, beta: BigInt(beta)}
  }

  private readFile(): string[] {
    return readFileSync(this._javaFilePath).toString().split('\n')
  }
}
