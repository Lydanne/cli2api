# Model Serving Sandbox Evidence

- `pnpm build`: passed for shared, agents-sdk, core, and dash after adding the
  runtime workspace service and removing dashboard cwd controls.
- `pnpm test`: passed with 11 test files and 46 tests.
- `pnpm test:coverage`: passed; global coverage remained above 60%.
- `pnpm lint`: passed with zero warnings.
- `pnpm check:file-size`: passed; all checked source files are <= 1300 lines.
- `pnpm test:e2e`: passed with 2 Playwright tests. The API E2E verifies that a
  submitted profile `cwd` is replaced by a runtime workspace and safe policies.
- `./deploy.sh deploy && ./deploy.sh status`: passed; API and dashboard
  containers were rebuilt and reported healthy.
- Browser verification against `http://127.0.0.1:5173/#/instances`: the deployed
  instance page has no `instance-cwd` control and no visible `工作目录` text.
