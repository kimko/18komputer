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
     "oauthScopes": ["https://www.googleapis.com/auth/spreadsheets.currentonly"]
     ```

   This scope only works because the script is attached to the spreadsheet, which is what step 1
   did. If a deployment ever refuses it, deleting the line works; you just lose the guarantee that
   the script cannot reach your other spreadsheets.
5. **Deploy -> New deployment**, type **Web app**, then:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Approve the permissions prompt. It warns that the app is unverified; that is expected for your
   own script. Advanced -> Go to (unsafe). If you had already approved it before adding the scope
   above, Google asks again.
7. Copy the URL it gives you. It ends in `/exec`. Paste it into
   `src/services/remote/sheetConfig.js`.

## Two things that will waste your afternoon

**Editing the script does not change what the URL serves.** You have to publish a new version:
Deploy -> Manage deployments -> pencil icon -> Version: New version -> Deploy. The URL stays the
same. Skip this and you will be debugging code that is not running.

**The app must not send `Content-Type: application/json`.** Doing so makes the browser send a
separate permission-check request first, which Apps Script does not answer, and the call fails
before reaching this script. `src/services/remote/gamesSheet.js` posts JSON as `text/plain` on
purpose, and `doPost` parses `e.postData.contents` itself.

## What it does

| Call | Meaning |
| --- | --- |
| `GET  ?id=game_123_4` | Return that row, or `{ ok: false, error: 'not_found' }` |
| `POST` a game as JSON | Update the row with that id, or add one |

A write takes the script lock, so two people pressing Share at the same moment cannot half-write a
row.

## About the URL being public

It is in the app's JavaScript, so anyone can find it and call it. There is no way to hide a
password from a browser, so the script does not pretend to have one. Instead `doPost` refuses
anything that is not shaped like a game: the id must start with `game_` and be letters, digits,
dashes and underscores only, the required fields must be there, and the data cell must be under
45,000 characters. The worst case is a
stranger adding junk rows to a hobby spreadsheet, which you can select and delete. The
`spreadsheets.currentonly` scope keeps it away from the rest of your Drive.
