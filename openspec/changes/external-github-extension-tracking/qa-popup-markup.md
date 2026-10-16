# Native Chrome popup markup QA — 2026-10-13

## Scope

This check was limited to the remaining native-action-popup markup case for
`https://github.com/ITSUA-team/GiTiempo/issues/439`.  The intended payload was
the literal issue title `<img src=x onerror=window.__qaXss=1>`.  The test used
an isolated Chrome profile, a disposable copy of the Chrome build, and a local
stub for only `GET /time-entries/current` and `GET /workspace`.  It did not use
Firebase, GitHub credentials, a production API, or any GitHub write.

## Agent attempt: inconclusive — native popup target was not attachable

Chrome launched the isolated profile successfully and exposed its remote
debugging endpoint once during launch.  The disposable extension service
worker and the public issue page were therefore available to the initial
inspection.  Subsequent CDP connections from the controlled QA process were
refused, including after the native-popup probe was prepared.  Consequently
the test could not safely seed the synthetic extension session, call
`chrome.action.openPopup()`, or attach the transient *native* popup target.

No ordinary `popup.html` page was used as a substitute, and this file makes no
claim about native-popup rendering, escaping, or payload execution.  Existing
unit, injected-control, and User SPA markup checks remain separate evidence.

## Cleanup

The isolated Chrome profile, temporary extension copy, local stub, and their
logs were removed after the failed bounded attempt.  The repository build,
normal Chrome profile, and running local GiTiempo services were not changed.

## User follow-up: pass — literal text in the native Chrome popup

On 13 October 2026 the user completed the requested native-popup check in
their existing local Chrome extension. The requested console mutation set
the rendered issue title to `<img src=x onerror=alert(1)> QA text`; it changed
only the local page DOM, without editing the issue on GitHub. The user opened
the extension popup and confirmed: “показує як звичайний текст” in response
to the question whether the title appeared literally without an image or
alert. No timer start was requested. Reloading the issue to restore its DOM
was part of the instructions; completion of that cleanup was not separately
reported.

This is user-attested native Chrome popup evidence, not an independent CDP
DOM inspection or a Firefox markup test. Together with the prior actual
injected-control and User SPA text-rendering checks, controlled invalid-input
requests and stored-title/provenance preservation, it closes the remaining
task 9.19 rendering gap. The broader extension failure/Firefox matrices stay
separate and incomplete.
