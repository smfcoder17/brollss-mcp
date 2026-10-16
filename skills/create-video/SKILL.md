---
name: create-video
description: Create a new Brollss project from a video or audio file (a file on the user's device, a direct link, or on a local server a path on this machine), wait for the transcription, then hand over to the edit-video skill.
---

# Create video

## When to use

- The user gives you a video or audio file, or a link to one, and wants it edited in Brollss.
- The user wants a new Brollss project. To edit a project that already exists ("make a full edit of <video>"), use the edit-video skill instead: it finds the project with `list_projects` and edits a fresh copy made by `clone_project`.

## Instructions

1. Ask what to import if the user has not said: a file on their device, or a direct link to a media file. A page that plays a video (a YouTube page, a share page) is not a media file. One file per project: import the main recording, then edit.
2. Call `import_media` with one source:
   - **Direct upload.** `add_media` with one entry, keyed by the file name: `{"talk.mp4": {"content_type": "video/mp4", "file_size": 734003200}}`. `content_type` is the file's MIME type, `file_size` its exact size in bytes. See "Uploading a local file" below.
   - **Link.** `url`, a direct http(s) link to the media file, passed as the user gave it.
   - **Path on this machine.** `path`, an absolute path to the file or to a folder that holds it. Only the local Brollss server (stdio) reads it; the hosted server refuses it.
3. `import_media` returns at once with `job_id`, `project_id` and `project_url`. Show `project_url` to the user. If you asked for a direct upload, finish the upload before you wait.
4. Wait for the import: call `wait_for_job` with the `job_id` and `wait_seconds: 20`, and call it again until it answers `done: true`. After each call, tell the user `progress.label` and `progress.percent`. An answer with `timed_out: true` means the import is still running: call `wait_for_job` again on the same `job_id`. Never import the file a second time because a wait timed out; that makes a second project.
5. When the job is ready, read the project with `get_project_state` on `project_id` and tell the user what was created (length, format, transcript size).
6. If the user wants an edit, follow the edit-video skill on `project_id`. A project you just imported is the user's own copy: edit it directly, no clone needed.

If the job fails, give the user its error as written. A refusal for the number of projects or the file size is the same limit the Brollss app applies: say which one and stop.

## Uploading a local file

1. Call `import_media` with `add_media` as above.
2. The response includes `upload_urls`, keyed by the same file name, with `upload_url`, `asset_id` and `headers`. `PUT` the raw bytes of the file to `upload_url` with those headers (`Content-Type: application/octet-stream`): no form, no encoding. The size you send must equal `file_size`. The address works once, for this job only.
3. If the `PUT` fails, call `report_upload_status` with the `job_id`, `media_id` (the file name you used in `add_media`) and `status: "failed"`, so the import stops cleanly.
4. Then recover: call `import_media` again for a new address if the failure looks temporary, or ask the user for a direct link to the file. Never pass a container or sandbox path (such as `/mnt/data/...`) to `import_media`: the hosted server cannot reach it. If nothing works from this environment, tell the user the file cannot be uploaded from here and what they can do instead (share a direct link, or import it in the Brollss app).
