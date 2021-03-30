namespace ts {
    describe("unittests:: tsbuild:: persistResolutions::", () => {
        function getFs(outFile?: string) {
            return loadProjectFromFiles({
                "/src/project/src/main.ts": Utils.dedent`
                    import { something } from "./filePresent";
                    import { something as something1 } from "./filePresent";
                    import { something2 } from "./fileNotFound";`,
                "/src/project/src/anotherFileReusingResolution.ts": Utils.dedent`
                    import { something } from "./filePresent";
                    import { something2 } from "./fileNotFound";`,
                "/src/project/src/filePresent.ts": `export function something() { return 10; }`,
                "/src/project/src/fileWithRef.ts": `/// <reference path="./types.ts"/>`,
                "/src/project/src/types.ts": `interface SomeType {}`,
                "/src/project/src/globalMain.ts": Utils.dedent`
                        /// <reference path="./globalFilePresent.ts"/>
                        /// <reference path="./globalFileNotFound.ts"/>
                        function globalMain() { }
                    `,
                "/src/project/src/globalAnotherFileWithSameReferenes.ts": Utils.dedent`
                        /// <reference path="./globalFilePresent.ts"/>
                        /// <reference path="./globalFileNotFound.ts"/>
                        function globalAnotherFileWithSameReferenes() { }
                    `,
                "/src/project/src/globalFilePresent.ts": `function globalSomething() { return 10; }`,
                "/src/project/tsconfig.json": JSON.stringify({
                    compilerOptions: {
                        module: "amd",
                        composite: true,
                        persistResolutions: true,
                        traceResolution: true,
                        outFile
                    },
                    include: ["src/**/*.ts"]
                }),
            });
        }
        verifyTscSerializedIncrementalEdits({
            scenario: "persistResolutions",
            subScenario: `saves resolution and uses it for new program`,
            fs: getFs,
            commandLineArgs: ["--b", "src/project"],
            incrementalScenarios: [
                noChangeRun,
                {
                    subScenario: "Modify globalMain file",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: fs => appendText(fs, `/src/project/src/globalMain.ts`, `globalSomething();`),
                },
                {
                    subScenario: "Add new globalFile and update globalMain file",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: fs => {
                        fs.writeFileSync(`/src/project/src/globalNewFile.ts`, "function globalFoo() { return 20; }");
                        prependText(fs, `/src/project/src/globalMain.ts`, `/// <reference path="./globalNewFile.ts"/>
`);
                        appendText(fs, `/src/project/src/globalMain.ts`, `globalFoo();`);
                    },
                },
                {
                    subScenario: "Write file that could not be resolved by referenced path",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: fs => fs.writeFileSync(`/src/project/src/globalFileNotFound.ts`, "function globalSomething2() { return 20; }"),
                },
                {
                    subScenario: "Clean resolutions",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: noop,
                    commandLineArgs: ["--b", "src/project", "--cleanPersistedProgram"]
                },
                {
                    subScenario: "Clean resolutions again",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: noop,
                    commandLineArgs: ["--b", "src/project", "--cleanPersistedProgram"]
                },
                noChangeRun,
                {
                    subScenario: "Modify global main file",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: fs => appendText(fs, `/src/project/src/globalMain.ts`, `globalSomething();`),
                },
                {
                    subScenario: "Modify main file",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: fs => appendText(fs, `/src/project/src/main.ts`, `something();`),
                },
                {
                    subScenario: "Add new module and update main file",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: fs => {
                        fs.writeFileSync(`/src/project/src/newFile.ts`, "export function foo() { return 20; }");
                        prependText(fs, `/src/project/src/main.ts`, `import { foo } from "./newFile";`);
                    },
                },
                {
                    subScenario: "Write file that could not be resolved",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: fs => fs.writeFileSync(`/src/project/src/fileNotFound.ts`, "export function something2() { return 20; }"),
                    // when doing clean build, fileNotFound.ts would be resolved so the output order in outFile.js would change
                    // In build mode the out is generated only when there are no errors
                    // Outputs are generated, buildinfo is updated to report no errors
                    cleanBuildDiscrepancies: () => new Map([
                        [`/src/project/src/filepresent.js`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/filepresent.d.ts`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/filenotfound.js`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/filenotfound.d.ts`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/anotherfilereusingresolution.js`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/anotherfilereusingresolution.d.ts`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/main.js`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/main.d.ts`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/newfile.js`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/newfile.d.ts`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/types.js`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/types.d.ts`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/filewithref.js`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/filewithref.d.ts`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/globalfilepresent.js`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/globalfilepresent.d.ts`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/globalfilenotfound.js`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/globalfilenotfound.d.ts`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/globalanotherfilewithsamereferenes.js`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/globalanotherfilewithsamereferenes.d.ts`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/globalmain.js`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/globalmain.d.ts`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/globalnewfile.js`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/src/globalnewfile.d.ts`, CleanBuildDescrepancy.CleanFilePresent],
                        [`/src/project/tsconfig.tsbuildinfo`, CleanBuildDescrepancy.CleanFileTextDifferent],
                    ]),
                },
                {
                    subScenario: "Clean resolutions",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: noop,
                    commandLineArgs: ["--b", "src/project", "--cleanPersistedProgram"]
                },
                {
                    subScenario: "Clean resolutions again",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: noop,
                    commandLineArgs: ["--b", "src/project", "--cleanPersistedProgram"]
                },
                noChangeRun,
                {
                    subScenario: "Modify main file",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: fs => appendText(fs, `/src/project/src/main.ts`, `something();`),
                },
                {
                    subScenario: "Delete file that could not be resolved",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: sys => sys.unlinkSync(`/src/project/src/fileNotFound.ts`),
                },
            ],
            baselinePrograms: true,
        });

        verifyTscSerializedIncrementalEdits({
            scenario: "persistResolutions",
            subScenario: `saves resolution and uses it for new program with outFile`,
            fs: () => getFs("outFile.js"),
            commandLineArgs: ["--b", "src/project"],
            incrementalScenarios: [
                noChangeRun,
                {
                    subScenario: "Modify globalMain file",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: fs => appendText(fs, `/src/project/src/globalMain.ts`, `globalSomething();`),
                },
                {
                    subScenario: "Add new globalFile and update globalMain file",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: fs => {
                        fs.writeFileSync(`/src/project/src/globalNewFile.ts`, "function globalFoo() { return 20; }");
                        prependText(fs, `/src/project/src/globalMain.ts`, `/// <reference path="./globalNewFile.ts"/>
`);
                        appendText(fs, `/src/project/src/globalMain.ts`, `globalFoo();`);
                    },
                },
                {
                    subScenario: "Write file that could not be resolved by referenced path",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: fs => fs.writeFileSync(`/src/project/src/globalFileNotFound.ts`, "function globalSomething2() { return 20; }"),
                },
                {
                    subScenario: "Clean resolutions",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: noop,
                    commandLineArgs: ["--b", "src/project", "--cleanPersistedProgram"]
                },
                {
                    subScenario: "Clean resolutions again",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: noop,
                    commandLineArgs: ["--b", "src/project", "--cleanPersistedProgram"]
                },
                noChangeRun,
                {
                    subScenario: "Modify global main file",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: fs => appendText(fs, `/src/project/src/globalMain.ts`, `globalSomething();`),
                },
                {
                    subScenario: "Modify main file",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: fs => appendText(fs, `/src/project/src/main.ts`, `something();`),
                },
                {
                    subScenario: "Add new module and update main file",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: fs => {
                        fs.writeFileSync(`/src/project/src/newFile.ts`, "export function foo() { return 20; }");
                        prependText(fs, `/src/project/src/main.ts`, `import { foo } from "./newFile";`);
                    },
                },
                {
                    subScenario: "Write file that could not be resolved",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: fs => fs.writeFileSync(`/src/project/src/fileNotFound.ts`, "export function something2() { return 20; }"),
                    // when doing clean build, fileNotFound.ts would be resolved so the output order in outFile.js would change
                    // In build mode the out is generated only when there are no errors
                    cleanBuildDiscrepancies: () => new Map([
                        ["/src/project/outfile.tsbuildinfo", CleanBuildDescrepancy.CleanFileTextDifferent],
                        ["/src/project/outfile.js", CleanBuildDescrepancy.CleanFilePresent],
                        ["/src/project/outfile.d.ts", CleanBuildDescrepancy.CleanFilePresent],
                        ["/src/project/outfile.tsbuildinfo.baseline.txt", CleanBuildDescrepancy.CleanFilePresent],
                    ]),
                },
                {
                    subScenario: "Clean resolutions",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: noop,
                    commandLineArgs: ["--b", "src/project", "--cleanPersistedProgram"]
                },
                {
                    subScenario: "Clean resolutions again",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: noop,
                    commandLineArgs: ["--b", "src/project", "--cleanPersistedProgram"]
                },
                noChangeRun,
                {
                    subScenario: "Modify main file",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: fs => appendText(fs, `/src/project/src/main.ts`, `something();`),
                },
                {
                    subScenario: "Delete file that could not be resolved",
                    buildKind: BuildKind.IncrementalDtsChange,
                    modifyFs: sys => sys.unlinkSync(`/src/project/src/fileNotFound.ts`),
                },
            ],
            baselinePrograms: true,
        });
    });
}