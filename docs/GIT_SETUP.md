# Keeping this repo out of your arda setup

Current state: your **global** git identity is `Mat <mat@arda.cards>` and
GitHub credentials come from the arda-authenticated `gh` CLI. This repo is
local-only with one scaffold commit, so nothing has leaked anywhere — but
any future commit/push will use the arda identity until you do one of the
following.

## Option A — per-repo identity (2 commands, do this first)

```bash
cd "~/chamber app/visit-kingston"
git config user.name  "Matt Hager"
git config user.email "matt.hager12@gmail.com"
# rewrite the scaffold commit so no arda email is in history:
git commit --amend --reset-author --no-edit
```

Repo-local config always beats global. Done — commits are personal.

## Option B — automatic for everything under `~/chamber app/`

Add to `~/.gitconfig`:

```ini
[includeIf "gitdir:~/chamber app/"]
    path = ~/.gitconfig-personal
```

And create `~/.gitconfig-personal`:

```ini
[user]
    name = Matt Hager
    email = matt.hager12@gmail.com
```

Any repo you ever create under `chamber app/` picks up the personal
identity automatically. (Option A still worth doing once for the amend.)

## Pushing to a personal GitHub later

The `gh` CLI supports multiple accounts:

```bash
gh auth login            # log in with the personal account when prompted
gh auth switch           # flip between arda and personal
gh repo create visit-kingston --private --source . --push
```

Or skip `gh` entirely for this repo with an SSH remote + a personal SSH key
(`Host github-personal` alias in `~/.ssh/config`). Either way, do Option A
**before** the first push so history carries the right author.
