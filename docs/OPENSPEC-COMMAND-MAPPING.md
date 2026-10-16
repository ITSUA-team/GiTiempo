# OpenSpec Commands: Zed Skills ↔ OpenCode Commands

This document maps the equivalent agent instructions for OpenSpec workflows
across Zed (`.agents/skills/`) and OpenCode (`.opencode/commands/`).

## Why two systems?

| System  | Location                     | Format                          | Trigger                |
|---------|------------------------------|---------------------------------|------------------------|
| Zed     | `.agents/skills/<name>/SKILL.md` | Directory + `SKILL.md`, frontmatter requires `name` + `description` | Auto-loaded by agent or `/skill-name` slash command |
| OpenCode| `.opencode/commands/<name>.md`   | Flat `.md` file, frontmatter requires `description` only | `/opsx-name` slash command |

Both systems coexist in the repo. The instruction **body** is intentionally
identical so behavior stays consistent whether you use Zed or OpenCode.

## Mapping Table

| Zed Skill                                   | OpenCode Command                     | Purpose                                      |
|---------------------------------------------|--------------------------------------|----------------------------------------------|
| `openspec-propose`                          | `opsx-propose.md`                    | Create a new change with all artifacts       |
| `openspec-apply-change`                     | `opsx-apply.md`                      | Implement tasks from a change                |
| `openspec-archive-change`                   | `opsx-archive.md`                    | Archive a completed change                   |
| `openspec-explore`                          | `opsx-explore.md`                    | Explore mode — think before implementing     |
| `openspec-implementation-readiness`         | `opsx-implementation-readiness.md`   | Read-only readiness review before implementing |

## Frontmatter Differences

### Zed `SKILL.md`

```yaml
---
name: openspec-propose               # required, must match directory name
description: ...                      # required, 1–1024 chars
license: MIT                          # optional
compatibility: Requires openspec CLI  # optional
metadata:                             # optional
  author: openspec
  version: "1.0"
  generatedBy: "1.3.0"
---
```

### OpenCode command `.md`

```yaml
---
description: ...                      # required
---
```

## Keeping Content in Sync

When updating an OpenSpec workflow instruction, update **both** files:

1. **Zed skill**: `.agents/skills/<skill-name>/SKILL.md`
2. **OpenCode command**: `.opencode/commands/<command-name>.md`

The instruction body (everything after the frontmatter `---`) should be
identical in both files. Only the frontmatter differs.

### Sync Checklist

- [ ] Frontmatter: Zed uses `name` + `description` + optional fields; OpenCode uses `description` only
- [ ] Body: copy-paste identical content after the closing `---`
- [ ] Cross-references: Zed skills reference each other by skill name; OpenCode commands reference each other by `/opsx-*` slash command
- [ ] Test: verify the command works in both editors after changes

## Adding a New OpenSpec Command

1. Create the OpenCode command: `.opencode/commands/opsx-<name>.md`
2. Create the Zed skill directory: `.agents/skills/openspec-<name>/`
3. Write `SKILL.md` with proper frontmatter (`name` must match directory)
4. Copy the instruction body from the OpenCode command
5. Add the mapping to the table above