import { expect, test } from "@jest/globals";
import {JavaVersionParser} from '../src/JavaVersionParser'

test("parsing Version.java source file from a release", () => {
  const parser = new JavaVersionParser("__tests__/Version_Release.java")
  const {major,minor,fix,dotted}=parser.parse()
  expect(major).toBe('1')
  expect(minor).toBe('2023')
  expect(fix).toBe('04')
  expect(dotted).toBe('1.2023.04')
});

test("parsing Version.java source file from a snapshot", () => {
  const parser = new JavaVersionParser("__tests__/Version_Snapshot.java")
  const {major,minor,fix,dotted}=parser.parse()
  console.log({major,minor,fix})
  expect(major).toBe('1')
  expect(minor).toBe('2023')
  expect(fix).toBe('6beta1')
  expect(dotted).toBe('1.2023.6beta1')
});

//import * as path from "path";
// shows how the runner will run a javascript action with env / stdout protocol
// test("test runs", () => {
//   process.env["INPUT_MILLISECONDS"] = "500";
//   const np = process.execPath;
//   const ip = path.join(__dirname, "..", "lib", "main.js");
//   const options: cp.ExecFileSyncOptions = {
//     env: process.env
//   };
//   console.log(cp.execFileSync(np, [ip], options).toString());
// });
