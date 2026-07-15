# Dependency Management & Software Supply Chain Security Standard

**Owner:** NB-Security-Engineer  
**Status:** Template default — specialise per project as needed.  
**Precedence:** This file SPECIALISES `.clinerules/security.md` and `.clinerules/coding-standards.md` for dependency-specific rules.

---

## Overview

This standard establishes formal governance over package dependencies, supply chain security, and software composition across all NB-managed projects.

Dependency vulnerabilities and compromised packages represent critical supply chain attack vectors. This standard mitigates those risks through explicit package manager governance, lifecycle script security, immutable dependency locking, and structured security validation.

---

## Package Manager Standard

### Approved Package Manager

**Yarn** is the only approved package manager for all NB-managed projects.

### Approved Commands

```bash
yarn add                 # Add new dependency
yarn remove             # Remove dependency
yarn install            # Install dependencies from lock file
yarn upgrade            # Upgrade dependencies with lock file update
yarn audit              # Audit dependencies for vulnerabilities
```

### Not Approved (Prohibited)

The following commands and tools are **not approved** unless explicitly exempted by NB-Security-Engineer:

```bash
npm install             # Use yarn install instead
npm update              # Use yarn upgrade instead
npm audit fix           # Use yarn audit and manual review instead
package-lock.json       # Use yarn.lock only; delete package-lock.json
npm ci                  # Use yarn install --immutable instead
pnpm                    # Unsupported package manager
```

**Rationale:**

- Yarn provides superior dependency resolution and reproducibility
- Yarn's lock file is more deterministic across environments
- npm's scripts can introduce supply chain attack vectors
- Yarn enables granular script control via `.npmrc` configuration

---

## Lifecycle Script Security

### Security Risk: Lifecycle Scripts

Lifecycle scripts are arbitrary code that runs automatically during package installation. They represent a significant supply chain attack vector.

#### Attack Vectors

**Postinstall Scripts:**
- Execute after `npm install` / `yarn install`
- Run with full filesystem access
- Can exfiltrate environment variables, private keys, source code
- Often run unattended in CI/CD pipelines
- Difficult to audit due to transitive dependencies

**Preinstall Scripts:**
- Execute before installation begins
- Can modify installation behaviour
- Can download and execute arbitrary code

**Prepare Scripts:**
- Execute after installation completes
- Intended for build steps but can contain malicious code
- Often run in development workflows

#### Example Attack Scenario

```
1. Attacker compromises popular npm package
2. Attacker injects postinstall script into package
3. Script silently exfiltrates private keys from .env files
4. Script commits malicious code to GitHub repositories
5. Organization discovers compromise weeks or months later
6. Multiple projects affected due to transitive dependencies
```

### Required Configuration

Every project must contain `.npmrc` with:

```ini
ignore-scripts=true
```

This setting:
- Disables all automatic lifecycle scripts
- Applies to direct and transitive dependencies
- Requires explicit execution only when necessary
- Must be committed to version control

### .npmrc Location

Place `.npmrc` in the project root alongside `package.json`.

**File Contents:**

```ini
# Dependency Management & Supply Chain Security
# Owner: NB-Security-Engineer

# Disable automatic lifecycle scripts to prevent supply chain attacks
# See: standards/dependency-management.md
ignore-scripts=true

# Immutable lock file enforcement
# Prevents accidental lock file updates
yarn-offline-mirror-pruning=true
```

### When Lifecycle Scripts Are Necessary

If a dependency genuinely requires lifecycle script execution:

1. **Document the requirement:**
   - Add to project decision log
   - Explain why the package requires it
   - Identify the specific script that must run

2. **Audit the script:**
   - Review the script source code
   - Ensure no malicious or suspicious behaviour
   - Verify script is necessary for the package to function

3. **Execute explicitly:**
   - Run script manually after inspection
   - Verify output
   - Document in project decisions

4. **Review alternatives:**
   - Identify if alternative packages exist without the script requirement
   - Assess switching costs vs. security risk
   - Record decision in project decisions

---

## Dependency Risk Analysis

Before introducing any new dependency, conduct a structured risk assessment.

### Required Review Criteria

Every new package must be evaluated against:

#### 1. Maintainer Reputation

- Is the maintainer known and trusted?
- Does the maintainer maintain multiple projects?
- Are they active in the open source community?
- Have they maintained this package for an extended period?

**Questions to Ask:**
- Who is the primary maintainer?
- How long have they maintained this project?
- What other projects do they maintain?
- Do they respond to security issues promptly?

#### 2. Package Ownership History

- Has package ownership changed recently?
- Who currently owns the package on npm registry?
- Are the current maintainers the original authors?
- Has there been a suspicious transfer of ownership?

**Red Flags:**
- Unexpected ownership transfer
- Unknown maintainer taking over popular package
- Multiple maintainer changes in short period
- Owner with minimal other projects

#### 3. Maintenance Activity

- How frequently is the package updated?
- Are issues addressed in reasonable timeframe?
- Is security patching responsive?
- Is the package actively maintained or abandoned?

**Assessment Methods:**
- Review GitHub commit history (last 6 months)
- Check issue resolution time
- Review recent security disclosures
- Check npm package page for update frequency

#### 4. Transitive Dependency Count

- How many total dependencies does this package bring?
- What is the depth of dependency tree?
- Are dependencies themselves well-maintained?

**Rationale:**
- More dependencies = larger attack surface
- Each dependency is a potential vulnerability
- Transitive dependencies are harder to audit
- Deep dependency trees make upgrades risky

**Assessment:**
```bash
npm ls --depth=0           # Direct dependencies
npm ls                     # Full tree
yarn why <package-name>    # Reverse dependency analysis
```

#### 5. Install-Time Behaviour

- Does the package modify filesystem?
- Does it make network requests during installation?
- Does it write to global locations?
- Does it require elevated permissions?

**Red Flags:**
- Downloads executables during install
- Makes network calls for unnecessary reasons
- Requires sudo/admin permissions
- Modifies system files

#### 6. Known Vulnerabilities

- Are there known security vulnerabilities?
- How are they being addressed?
- Are patches available?
- What is the severity level?

**Tools:**
- npm audit
- yarn audit
- Snyk database
- GitHub security advisories

### Preferred Dependency Analysis Tooling

#### Socket.dev

Comprehensive package analysis including:
- Dependency tree inspection
- Supply chain risk scoring
- Maintainer reputation analysis
- Known vulnerability detection
- Package behaviour analysis
- Malware detection

**How to Use:**
1. Browse package on socket.dev
2. Review risk score and category breakdown
3. Inspect dependency tree
4. Check for known vulnerabilities
5. Document findings in decision log

#### Snyk

Vulnerability scanning and remediation:
- Real-time vulnerability database
- Automated patch recommendations
- License compliance checking
- SBOM generation

**How to Use:**
1. Integrate Snyk into CI/CD
2. Scan on every dependency update
3. Address critical findings before merge
4. Generate reports for audit trail

### Documentation Requirements

Record package assessment in project decision log:

```
Package Name: [name]
Version: [version]
Purpose: [what it's used for]

Risk Assessment:
- Maintainer: [trusted/unknown/at-risk]
- Maintenance Activity: [active/stale/abandoned]
- Vulnerabilities: [none/low/medium/high]
- Transitive Dependencies: [count]
- Special Considerations: [lifecycle scripts required?]

Decision: APPROVED / REJECTED / CONDITIONAL

Rationale: [why approved or rejected]
```

---

## Lockfile Enforcement

### Yarn.lock Requirement

All projects must maintain:

```
yarn.lock
```

This file is:
- **Mandatory:** Must exist in version control
- **Immutable:** Never manually edit
- **Authoritative:** Single source of truth for dependency versions
- **Deterministic:** Ensures identical installations across all environments

### Version Control Rules

**Committed to Repository:**
- `yarn.lock` (always)
- `.npmrc` (always)
- `package.json` (always)

**Never Committed:**
- `node_modules/` (use .gitignore)
- `.npm/` (use .gitignore)
- `package-lock.json` (delete and add to .gitignore)

### CI/CD Installation Strategy

All continuous integration pipelines must use:

```bash
yarn install --immutable
```

This flag:
- **Fails if lock file is outdated:** Prevents accidental lock file changes
- **Enforces consistency:** Exact versions across all builds
- **Prevents supply chain drift:** No mysterious version updates
- **Audit trail:** CI logs show exact versions used

### Installation Examples

#### Development Environment

```bash
# Initial setup
yarn install

# Update dependencies (with lock file update)
yarn upgrade

# Add new dependency (with lock file update)
yarn add <package-name>
```

#### CI/CD Pipeline

```bash
# Strict immutable installation
yarn install --immutable

# Verify lock file integrity
yarn install --immutable --check-cache
```

#### Docker/Container Builds

```dockerfile
# Immutable install for production
RUN yarn install --immutable --production
```

### Rationale for Immutable Installs

1. **Supply Chain Integrity:** Exact same versions in all environments
2. **Reproducibility:** Builds are deterministic and auditable
3. **Regression Prevention:** No accidental dependency updates breaking code
4. **Audit Trail:** Lock file shows exact versions at time of change
5. **Security:** Prevents silent patching of vulnerabilities in CI

---

## Dependency Lifecycle

### Adding Dependencies

**Steps:**

1. **Assess the package:**
   - Conduct risk analysis per "Dependency Risk Analysis" section
   - Document decision in project decision log
   - Obtain approval from NB-Security-Engineer if high-risk

2. **Add the dependency:**
   ```bash
   yarn add <package-name>
   ```
   - Yarn automatically updates `package.json` and `yarn.lock`

3. **Review changes:**
   - Inspect `yarn.lock` changes
   - Verify transitive dependencies
   - Check for unexpected version selections

4. **Test locally:**
   - Verify package functionality works as expected
   - Run full test suite to ensure no regressions
   - Check for unexpected behaviour

5. **Commit changes:**
   - Include `package.json` and `yarn.lock` in same commit
   - Commit message must reference package addition
   - Example: `TASK-123: Add lodash for utility functions`

6. **Update project inventory:**
   - Document in `resources/system-inventory.md` (Key Dependencies table)
   - Record purpose and justification

### Upgrading Dependencies

**For Patch/Minor Updates (low risk):**

1. Identify candidate package: `yarn upgrade <package-name>`
2. Run full test suite
3. Verify no regressions
4. Commit with message: `TASK-123: Upgrade lodash to 4.17.21`

**For Major Version Upgrades (high risk):**

1. Create separate work item (TASK-xxx)
2. Conduct risk assessment
3. Plan migration if breaking changes exist
4. Test extensively
5. Document breaking changes
6. Obtain approval from technical lead before merge

**For Dependency Audit:**

```bash
yarn audit                    # Identify vulnerabilities
yarn audit --level=moderate   # Filter by severity
```

### Removing Dependencies

**Steps:**

1. **Verify it's safe to remove:**
   - Search codebase for all usages
   - Ensure no other packages depend on it

2. **Remove the dependency:**
   ```bash
   yarn remove <package-name>
   ```

3. **Test thoroughly:**
   - Run full test suite
   - Verify affected functionality
   - Check for regressions

4. **Commit changes:**
   - Commit message: `TASK-123: Remove unused lodash dependency`

5. **Update inventory:**
   - Update `resources/system-inventory.md` (Key Dependencies table)

### Handling Compromised Packages

**If a dependency is discovered to be compromised:**

1. **Immediate Actions:**
   - Remove dependency immediately
   - Search codebase for sensitive data exposure
   - Review git logs for what data was accessible

2. **Assessment:**
   - Determine scope of compromise
   - Identify affected versions
   - Check if organization was targeted specifically

3. **Remediation:**
   - Remove or patch affected dependency
   - Audit system for unauthorized access
   - Rotate credentials if necessary

4. **Prevention:**
   - Document incident
   - Identify what could have prevented it
   - Implement improved monitoring

5. **Communication:**
   - Notify team of compromise
   - Document timeline of discovery to remediation
   - Update project decisions log

---

## Dependency Governance Responsibilities

### NB-Security-Engineer

**Owner of this standard and supply chain security**

- Own and maintain `dependency-management.md`
- Enforce Yarn-only policy
- Validate `.npmrc` configuration in all projects
- Review all package additions before approval
- Review major package version upgrades
- Review dependency scan results
- Verify immutable install configuration in CI
- Assess supply chain risk for high-risk packages
- Conduct lifecycle script inspection when required

### NB-Backend-Specialist

**Dependency introduction and package selection**

- Use only Yarn for dependency management
- Evaluate package maintenance activity before introduction
- Evaluate security history of packages
- Assess package popularity and alternatives
- Assess bundle impact of new dependencies
- Prefer existing project dependencies where possible
- Document dependency additions in commit messages

### NB-QA-Engineer

**Dependency validation and testing**

- Validate clean yarn installs in test environments
- Validate immutable installs (`yarn install --immutable`)
- Verify lockfile integrity on each build
- Verify dependency scans completed
- Include dependency validation in release approval process
- Maintain test coverage for dependency-related validation

### NB-Project-Admin

**Dependency governance tracking**

- Track all package additions in project board
- Track major package removals as separate work items
- Track major version upgrades as separate work items
- Ensure dependency changes are visible and traceable
- Create work items for dependency-related governance changes
- Maintain dependency inventory in project documentation

### NB-Solution-Analyst

**Dependency discovery during project onboarding**

- Inspect `package.json` and `yarn.lock` during discovery
- Inspect `.npmrc` configuration
- Document in `resources/system-inventory.md` (Key Dependencies table):
  - Package manager in use
  - Total direct and transitive dependency count
  - Lifecycle script configuration
  - Security tooling integration
  - CI install strategy
  - Lockfile status and health

### NB-Context-Loader

**Dependency governance context loading**

- When loading project context, inspect:
  - `package.json`
  - `yarn.lock`
  - `.npmrc`
  - `standards/dependency-management.md`
- Load dependency governance requirements before implementation work
- Flag if project is not compliant with dependency standards
- Recommend security review if governance issues exist

---

## Compliance Checklist

Every project must verify:

- [ ] Package manager: Yarn (npm and pnpm are not used)
- [ ] `.npmrc` exists and contains `ignore-scripts=true`
- [ ] `yarn.lock` is in version control
- [ ] `package-lock.json` does not exist (deleted and in .gitignore)
- [ ] CI/CD uses `yarn install --immutable`
- [ ] New package additions documented in project decisions
- [ ] Dependency security scans integrated (Socket.dev or Snyk)
- [ ] No lifecycle scripts run automatically
- [ ] Dependency inventory documented
- [ ] Yarn audit run and vulnerabilities addressed

---

## Escalation & Exceptions

### When Standard Cannot Be Met

If a project or dependency cannot meet this standard, the exception must be:

1. **Documented:** Create an issue explaining why
2. **Justified:** Provide business rationale
3. **Scoped:** Clearly identify which rules cannot be met
4. **Approved:** Requires explicit approval from NB-Security-Engineer
5. **Reviewed:** Set review date to revisit exception

### Exception Process

1. Create ISSUE item in project board
2. Document exception request
3. Submit for NB-Security-Engineer approval
4. Record in project decisions if approved
5. Re-evaluate exception quarterly

---

## Monitoring & Auditing

### Continuous Dependency Scanning

Integrate automated scanning:

- **Snyk:** Real-time vulnerability detection
- **Socket.dev:** Supply chain risk assessment
- **npm audit / yarn audit:** Quarterly full audits

### Audit Trail

All dependency changes must be auditable:
- Commit messages document purpose
- `yarn.lock` changes show versions
- Project board tracks approval
- Project decisions record justification

### Review Cadence

- **Monthly:** Run dependency security audits
- **Quarterly:** Review major version upgrade opportunities
- **Annually:** Reassess package portfolios and alternatives

---

## Related Standards

- [General Security Standards](../.clinerules/security.md)
- [Project Security Standards](security-standards.md)
- [Testing Standards](testing.md)
- [Coding Standards](coding-standards.md)
