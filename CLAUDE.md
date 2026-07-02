# prompt-repo

## What this is

A Prompt Library web app: add, search, copy, rate, and organize AI prompts, with per-prompt notes and JSON export/import. Data is stored locally (no backend).

## Target feature set

- Add prompts with title + full content
- Card list view with truncated preview
- Copy full prompt (title + content) to clipboard
- 5-star rating per prompt, persisted
- Per-prompt notes (add/edit/delete)
- Local persistence via `localStorage`
- JSON export & import with versioned schema, stats, conflict resolution, and rollback safety on failed import

## Draft data shapes

Prompt object:
```json
{
  "id": "krtx9m5w6v",
  "title": "Blog Outline Generator",
  "content": "You are an expert...",
  "createdAt": 1730829000000,
  "rating": 0
}
```

Notes map (separate localStorage key), keyed by prompt id:
```json
{
  "prompt-uuid": [
    {
      "noteId": "prompt-uuid-1730829000000",
      "promptId": "prompt-uuid",
      "text": "Remember to adjust tone for marketing audience.",
      "createdAt": 1730829000000,
      "updatedAt": 1730829000000
    }
  ]
}
```

Export file schema:
```json
{
  "version": 1,
  "exportedAt": "2025-10-06T12:34:56.789Z",
  "stats": { "totalPrompts": 12, "averageRating": 4.17, "mostUsedModel": "gpt-4o-mini" },
  "prompts": [ /* prompt objects */ ],
  "notes": { "<promptId>": [ /* note objects */ ] }
}
```

These shapes are a starting point, not a contract — feel free to diverge as the design evolves.

## Status

Repo is freshly initialized; no app code yet. Tech stack and build approach (vanilla JS vs. framework, build step or none) haven't been decided — discuss with the user before scaffolding.
