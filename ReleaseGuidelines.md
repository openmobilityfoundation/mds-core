# MDS-core Release Guidelines

MDS-core will see regular updates and new [releases][mds-core-releases]. This document describes the general guidelines around how and when a new release is cut.

## Table of Contents

* [Versioning](#versioning)
* [Release Process](#release-process)
  * [Goals](#goals)
  * [Project Meetings](#project-meetings)
  * [Roles](#roles)
  * [Schedule](#schedule)
  * [Approval by the Open Mobility Foundation](#approval-by-the-open-mobility-foundation)
  * [Communication and Workflow](#communication-and-workflow)
* [Branch Mechanics](#branch-mechanics)
* [Checklist](#release-checklist)

## Versioning

MDS-core uses [Semantic Versioning][semver]. Each release is associated with a [`git tag`][mds-core-tags] of the form `X.Y.Z`.

### Breaking vs. non-breaking changes

Since MDS-core is used by a broad ecosystem of both API consumers and implementers, it needs a strict definition of what changes are “non-breaking” and are therefore allowed in PATCH releases.

In the MDS-core spec, a breaking change is any change that requires either consumers or implementers to modify their code for it to continue to function correctly.

Examples of breaking changes include:

* Adding or removing a required endpoint or field
* Adding or removing a request parameter
* Changing the data type or semantics of an existing field, including clarifying previously-ambiguous requirements

Examples of non-breaking changes include:

* Adding or removing an optional endpoint or field
* Adding or removing enum values
* Modifying documentation or spec language that doesn't affect the behavior of the API directly

One implication of this policy is that clients should be prepared to ignore the presence of unexpected fields in responses and unexpected values for enums. This is necessary to preserve compatibility between PATCH versions within the same MINOR version range, since optional fields and enum values can be added as non-breaking changes.

### Ongoing version support

At this early stage, MDS-core will be moving relatively quickly with an eye toward stabilization rather than backwards-compatibility.

For now, MDS-core will maintain *two concurrent (MINOR) versions* (e.g. if `0.3.0` were the current version, the `0.2.x` series would continue to receive maintenance in addition to `0.3.x`).

## Release Process

The sections below define the release process itself, including timeline, roles, and communication best practices.

### Project Meetings

* Web conference work sessions will posted to the [MDS-Announce mailing list][mds-announce] and on the [MDS wiki](https://github.com/openmobilityfoundation/mobility-data-specification/wiki). Each working group typically meets every two weeks.

* The meeting organizer can use the [meeting template](https://github.com/openmobilityfoundation/mobility-data-specification/wiki/Web-Conference-Template) to prepare for project meetings. Use the [template markup code](https://github.com/openmobilityfoundation/mobility-data-specification/wiki/Web-Conference-Template/_edit) to create the next scheduled wiki meeting page before the meeting. Include the how to join the meeting and agenda details. Posting the agenda before the meeting has the added benefit that project contributors can propose agenda items.

### Goals

* _Fast, regular releases to support rapid evolution of MDS-core_

* _Consensus-oriented with clear decision making process when consensus can't be reached_

* _Encourage involvement from all stakeholders, especially public agencies_

* _Frequent stakeholder communication on GitHub, web conference, and in-person_

* _Regular review of release process to ensure it is serving the needs of the community._

### Roles

* **contributors** - Anyone making pull requests, opening issues, or engaging in technical discussion around implementation of features.

* **maintainers** - Project maintainers have commit privileges in the main MDS-core repository and are responsible for implementing changes such as merging of pull requests and the creation of release branches.

* **working group steering committees** - Review changes when consensus cannot be reached and make final release decision about what changes should be included in a release.

See the [MDS wiki](https://github.com/openmobilityfoundation/mobility-data-specification/wiki) for additional information on the working groups.

### Schedule

MDS-core operates on an approximately six month release cycle for both minor updates (0.y) and patches (0.y.z). In general, major updates (x.0.0) are expected no more than twice per year. The release cycle is broken down as follows:

#### Month 1: Plan (Solicit ideas and create release plan)

* WGSC solicits issues/PRs from community/ WG
* WG / WGSC decides which API specification versions to support in release (prior, current, or future)
* Issues/PRs are discussed and release plan drafted in wiki
* All issues/PRs on release plan should have a clear owner
* Issues/PRs tagged w/ appropriate milestone
* WGSC approves release plan, ideally with WG consensus

#### Months 2-5: Implement and refine (Write code and address open issues)

* Issue/PR owners submit proposed code changes on GitHub
* WG reviews and discusses in comments and on WG calls
* Release plan regularly reviewed by WG / WGSC
* WGSC may adjust release plan as needed
* At any point in the cycle, WG / WGSC may push some issues/PRs to future release

##### Month 6: Finalize (Merge PRs and finish release)

* Completed PRs are merged by WGSC / maintainers
* Conflicts are resolved with PR authors
* Documentation finalized by PR authors
* Release notes written by WGSC
* Release candidate approved by WGSC and submitted to Technology Council and Board of Directors for formal approval per OMF Bylaws

### Approval by the Open Mobility Foundation

Once a release is finalized by the working groups it will be considered a "release candidate" until it has been approved as an official deliverable by the Open Mobility Foundation. The OMF bylaws refer to this as a "Working Group Approved Deliverable (WGAD)."

The process for full OMF approval is detailed in Section 5.4 of the OMF bylaws, the latest version of which can be found [here](https://www.openmobilityfoundation.org/resources/). In summary:

1. The release candidate/WGAD will be provided to the OMF Technology Council for review and comment at least 75 days prior to the desired date of board approval.

1. The Technology Council will issue a report and/or recommendation for the Board of Directors within 60 days.

1. The Board of Directors will have a minimum of 30 days to review the Technology Council recommendation before taking a vote on the release candidate/WGAD.

1. Upon approval by the Board of Directors, the release will become an official deliverable of the OMF. It will be marked as such in GitHub and on the OMF web site, and it will be merged into the `master` branch on GitHub.

The approval status and anticipated timeline will be reflected in the [MDS wiki](https://github.com/openmobilityfoundation/mobility-data-specification/wiki).
While it is the intent of the OMF to have concerns, questions, and issues addressed during the regular working group release process, it is possible that the Technology Council or Board of Directors may request modifications to a release candidate/WGAD prior to official approval. If this situation occurs, the release candidate will be sent back to the working group(s) for additional changes after which it can be resubmitted to the Technology Council and Board of Directors.

The OMF recommends that regulatory agencies do not formally adopt or require any versions of the spec that have not been fully approved by the OMF Board of Directors. However, release candidates/WGADs are considered stable enough to allow API producers and consumers to begin developing against in anticipation of formal approval.
### Communication and Workflow

The release announcements and process schedule will be communicated via [MDS-Announce mailing list][mds-announce]. People wishing to stay informed should join the group for updates. Timing of web conference and in person work sessions will be communicated via MDS-Announce as well.

The following best practices are intended to create clarity around each release cycle:

* Categorize issues and PRs under an associated [Milestone][mds-core-milestones] for the release

* Assign a due date for said Milestone that aligns with proposed release date

* Pull requests and release notes should include a summary of the major changes / impacts associated with the change or release

* Proposed changes should come in the form of PRs to give the community ample awareness and time for feedback

## Branch Mechanics

The branching strategy we describe here is intended to handle ongoing maintenance changes in parallel with features for new releases.

### Primary branches

At a high-level, there are two primary branches:

* [`master`][mds-core-master] represents the latest release of MDS-core. It's only updated as part of the release process, and no pull requests should be based on or target it.

* [`develop`][mds-core-dev] contains all work that has happened since the last release, including both breaking and non-breaking changes.

### Feature branches

All development on changes to MDS-core should happen in branches cut from `develop` (with the exception of hotfixes to release branches, described below). When your work is ready for review, submit a PR against `develop`, ideally with any merge conflicts already resolved. `develop` serves as the collection point for all new feature work.

### Release branches

Whenever a MINOR version is released, a **release branch** will be created from `develop` to track any changes that should be included in subsequent PATCH versions. For example, at the time `0.4.0` is released, a branch called `0.4.x` will be created that initially points to the same commit as the `0.4.0` tag.

Release branches can be updated in two ways:

* When a non-breaking change has been merged to `develop`, a maintainer will usually [backport](#backporting-changes) it onto the newest release branch. This can be skipped if the change isn't relevant to the release branch (e.g., because it modifies language that was added after the last MINOR release) or if there are no plans to make another PATCH release with the same MINOR version.

* If a change needs to be made to spec language that exists in a release branch but is no longer relevant in `develop`, the contributor should create a feature branch based on the release branch and open a PR targeting the release branch directly. For example, if an endpoint was removed in `0.3.0` but needs to be modified for a `0.2.1` PATCH release, the contributor would create a PR based on the `0.2.x` release branch.

As stated earlier, at this time MDS-core will maintain *two concurrent MINOR versions*. This means that when a MINOR release is made (e.g. `0.4.0`), no further changes will be made to the outgoing series (`0.2.x`, in this case).

### Backporting changes

When non-breaking changes are merged to `develop`, it's generally necessary for a maintainer to backport these changes to the newest release branch so that they'll be included in any subsequent PATCH releases. There are a couple of different ways to do this:

* If the changes can be applied to the release branch without significant editing, the maintainer can use `git cherry-pick` to copy the changes from `develop` into the release branch (assuming the SHA of the merge commit on `develop` was `b70719b`):

  ```console
  git fetch
  git checkout 0.3.x
  git pull
  git cherry-pick -m 1 b70719b
  git push
  ```

  Note that the `-m 1` option is unnecessary if the PR was merged with the "Squash and merge" option instead of creating a merge commit.

* If backporting the change needs significant manual work (for example, if there were other changes to the relevant part of the spec in the last MINOR version), the maintainer can open a new PR for the backport targeting the relevant release branch.

  First, create a branch containing the backported change (again, assuming the SHA of the merge commit was `b70719b`):

  ```console
  git fetch
  git checkout 0.3.x
  git pull
  git checkout -b backport-helpful-change-to-0.3.x
  git cherry-pick -m 1 b70719b
  # Do any manual work needed to integrate the changes
  git push -u origin backport-helpful-change-to-0.3.x
  ```

  Next, create a PR with the release branch (in this case, `0.3.x`) as its `base`. Once that PR has been approved, merge the PR into the release branch as usual.

## Release Checklist

The following steps **must** be followed for **every** release of MDS-core:

1. Ensure the [Milestone][mds-core-milestones] for this release is at `100%`.

1. [Open a PR][mds-core-pr-new] against `develop` that updates [`ReleaseNotes.md`](ReleaseNotes.md) using the following format:

    ```md
    ## 1.2.3

    > Released yyyy-MM-dd

    High level summary of the release.

    * Specific change referencing a PR [#555](https://github.com/openmobilityfoundation/mobility-data-specification/pull/555)

    * Another change summary referencing a PR [#777](https://github.com/openmobilityfoundation/mobility-data-specification/pull/777)
    ```

    The description of this PR should include a link to a GitHub compare page showing the changes that will be included in the release. This URL depends on the type of release:

    * For a PATCH release like 0.4.2, compare the previous version in the series to the current state of the release branch: https://github.com/openmobilityfoundation/mobility-data-specification/compare/0.4.1...0.4.x

    * For a MINOR release like 0.5.0, compare the last release in the previous series to the current state of `develop`: https://github.com/openmobilityfoundation/mobility-data-specification/compare/master...dev

    In the case of a new MINOR version, allow a minimum of 24 hours for community discussion and review of the current state of the release.

1. Once the PR has been sufficiently reviewed, merge it into `develop`.

1. Create a tag for this release on the tip of `develop` (for MINOR versions) or the relevant release branch (for PATCH versions). For example, for `0.5.0`:

    ```console
    git fetch
    git checkout origin/dev
    git tag 0.5.0
    git push --tags
    ```

    Or for `0.4.2`:

    ```console
    git fetch
    git checkout origin/0.4.x
    git tag 0.4.2
    git push --tags
    ```

1. If this release is a MINOR version, create a new [release branch](#release-branches). For example, if you've just created the `0.5.0` tag:

    ```console
    git push origin 0.5.0:0.5.x
    ```

1. Unless this is a maintenance release on an older branch (for example, releasing `0.3.2` after `0.4.0` has already come out), update `master` to point to the new tag:

    ```console
    git checkout master
    git reset --hard 0.5.0
    git push --force origin master
    ```

1. Publish a [new Release in GitHub][mds-core-releases-new] for the tag you just pushed. Copy in the [release notes](ReleaseNotes.md) created earlier.

1. Post a release announcement to [`mds-announce`](mailto:mds-announce@groups.openmobilityfoundation.org), copying the [release notes](ReleaseNotes.md) created earlier and linking to the [GitHub release][mds-core-releases].

    ```email
    From:    mds-announce@groups.openmobilityfoundation.org
    To:      mds-announce@groups.openmobilityfoundation.org  
    Subject: MDS-core 1.2.3 Release  

    MDS-core 1.2.3 has been released.

    <release notes>

    <link to GitHub release>
    ```

[mds-announce]: https://groups.google.com/a/groups.openmobilityfoundation.org/forum/#!forum/mds-announce
[mds-core-dev]: https://github.com/openmobilityfoundation/mds-core/tree/develop
[mds-core-master]: https://github.com/openmobilityfoundation/mds-core/tree/master
[mds-core-milestones]: https://github.com/openmobilityfoundation/mds-core/milestones
[mds-core-pr]: https://github.com/openmobilityfoundation/mds-core/pulls
[mds-core-pr-new]: https://github.com/openmobilityfoundation/mds-core/compare
[mds-core-releases]: https://github.com/openmobilityfoundation/mds-core/releases
[mds-core-releases-new]: https://github.com/openmobilityfoundation/mds-core/releases/new
[mds-core-tags]: https://github.com/openmobilityfoundation/mds-core/tags
[semver]: https://semver.org/
