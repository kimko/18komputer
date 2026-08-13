# The Google Sheets store

`games.gs` is the code that reads and writes the game spreadsheet. It does not run in this app. It
runs on Google's servers, under your Google account, and this repo only keeps a copy so it is
versioned. **Nothing enforces that the deployed copy matches this file.** If you change one, change
the other.

Spreadsheet: <https://docs.google.com/spreadsheets/d/1HTMmF2rD4GyKBBinDo-GYWIJQOPtssyEYs1iqj-BxaY>

## Why this and not a Sheets API package

`googleapis` and `google-spreadsheet` need a service account private key. This app is a static
bundle on GitHub Pages, so the key would ship to every visitor and hand them write access. A script
living inside the spreadsheet needs no key: it already runs as you. The app only knows a public URL.

## Setting it up

1. Open the spreadsheet, then **Extensions -> Apps Script**.
2. Delete whatever is in `Code.gs` and paste the contents of `games.gs` over it.
3. Save. The `games` tab and its header row are created on the first write, so there is nothing to
   set up in the spreadsheet itself.
4. Limit what the script is allowed to touch, in two places:
   - **Project Settings** (the cog): tick *Show "appsscript.json" manifest file*. Nothing appears
     on this screen when you do. The tick only makes the file show up in the editor.
   - **Editor** (the `<>` icon): `appsscript.json` is now listed under Files next to `Code.gs`.
     Open it and add one key to whatever is already there:

     ```json
     "oauthScopes": [
       "https://www.googleapis.com/auth/spreadsheets.currentonly",
       "https://www.googleapis.com/auth/script.external_request"
     ]
     ```

   The first only works because the script is attached to the spreadsheet, which is what step 1 did.
   The second is what lets the script send problem reports out to Sentry in step 8. **Listing
   scopes here switches off Google's guessing**, so anything you leave out is refused, and a missing
   `script.external_request` shows up as reports that silently never arrive. If a deployment ever
   refuses these, deleting the lines works; you just lose the guarantee that the script cannot reach
   your other spreadsheets.
5. **Deploy -> New deployment**, type **Web app**, then:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Approve the permissions prompt. It warns that the app is unverified; that is expected for your
   own script. Advanced -> Go to (unsafe). If you had already approved it before adding the scope
   above, Google asks again.
7. Copy the URL it gives you. It ends in `/exec`. Paste it into
   `src/services/remote/sheetConfig.js`, over the whole value. The app decides the sheet is not set
   up yet by looking for the text `PASTE_` in that constant, so if you ever put a placeholder back,
   keep those letters in it or the "not set up yet" message never appears.
8. Tell the script where to report problems, so you find out about them without waiting for someone
   to complain. In the Apps Script editor: **Project Settings -> Script Properties -> Add script
   property**, name `SENTRY_DSN`, value the address of the `18komputer` project in Sentry. Leave it
   unset and reporting is simply off, which is what a copy of this repo running under somebody
   else's Google account should do.

## Three things that will waste your afternoon

**Editing the script does not change what the URL serves.** You have to publish a new version:
Deploy -> Manage deployments -> pencil icon -> Version: New version -> Deploy. The URL stays the
same. Skip this and you will be debugging code that is not running.

**The app must not send `Content-Type: application/json`.** Doing so makes the browser send a
separate permission-check request first, which Apps Script does not answer, and the call fails
before reaching this script. `src/services/remote/gamesSheet.js` posts JSON as `text/plain` on
purpose, and `doPost` parses `e.postData.contents` itself.

**`npm run dev` is not a sandbox.** There is no local copy of the sheet. Pressing Share on your own
machine writes a row to the same spreadsheet linked above, exactly as the published app does.
`scripts/devGameEndpoint.js` adds a `/__debug` route while you develop, but it only reads. The one
place with a real stand-in is the Playwright suite, which answers for the script itself in
`tests/fakeSheet.js`.

## What it does

| Call | Meaning |
| --- | --- |
| `GET  ?id=game_123_4` | Return that row, or `{ ok: false, error: 'not_found' }`. An id that fails the check below gets `bad_id` instead |
| `POST` a game as JSON | Update the row with that id, or add one. Answers with `created: true` when it added one, so the app can say "Game saved" rather than "Game updated" |

The app has a third answer, "No changes", for pressing Share twice on a game you have not touched.
That one never reaches this script.

A write takes the script lock, so two people pressing Share at the same moment cannot half-write a
row.

## Knowing when it breaks

If the script itself hits a problem, both calls answer `{ ok: false, error: 'server_error' }` and
send the details to Sentry. Before this existed, a crash made Apps Script return an HTML error page
that the app could not read at all, so the reason was simply lost.

Two refusals are reported as warnings rather than errors, because they mean somebody's save did not
happen: `busy`, when the sheet stayed locked for 15 seconds, and `too_large`. The refusals that come
from a stranger poking the public URL, `bad_id`, `bad_json`, `bad_body` and `missing_fields`, are
deliberately not reported, or the noise would bury the real problems.

Reporting can never break a save: it runs inside its own try/catch, so a Sentry outage does nothing.
The browser reports separately, tagged `browser` rather than `apps-script`, which is how you see the
failures this script cannot: the app being unable to reach it at all, or reaching a deployment that
was never republished.

## About the URL being public

It is in the app's JavaScript, so anyone can find it and call it. There is no way to hide a
password from a browser, so the script does not pretend to have one. Instead `doPost` refuses
anything that is not shaped like a game: the id must start with `game_` followed by 1 to 60
characters that are letters, digits, dashes or underscores; `ruleset` and `data` must both be
filled in, though `name`, `players` and `created` may be empty; and the data cell must be 45,000
characters or fewer. The worst case is a stranger adding junk rows to a hobby spreadsheet, which
you can select and delete. The `spreadsheets.currentonly` scope keeps it away from the rest of your
Drive.
