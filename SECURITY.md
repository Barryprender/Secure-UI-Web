# Security policy

Two things live in this repository, and a defect in one is much more serious
than a defect in the other.

**Secure-UI itself** is a component library other people install and ship. A
flaw in a component — an escaping gap, a validation bypass, a telemetry signal
that leaks something it should not — reaches every adopter's users, not ours.
That is the report we most want to receive.

**The showcase site** at secure-ui-web.fly.dev demonstrates the library. It holds
demo accounts: an email address, a bcrypt password hash, session tokens and
login-attempt records in SQLite. Real, but small, and not client data.

## Already known, and not a finding

The client-side signing key is a symmetric secret held in page memory. Any
same-page XSS or privileged script can read it and forge envelopes. The
signature is tamper-evidence against casual spoofing, not cryptographic proof.
This is stated in the site's FAQ and the component documentation, and it is a
design limit rather than a defect. A report that the key is extractable tells us
what we already publish; a report of a way to extract it *without* script
execution on the page does not, and we want that one.

The same applies to the telemetry signals: they are heuristic, and a determined
attacker can spoof them. The value is raising the cost of scripted attacks.

## Reporting a vulnerability

Email **barryprendergast78@gmail.com**. Say what you found, how to reproduce it,
and what it let you reach. If it concerns a component, name the version.

Do not open a public issue for a suspected vulnerability. Test against a local
instance — `README.md` has the steps — not against the live site.

What to expect:

| | |
| --- | --- |
| Acknowledgement | within 3 working days |
| First assessment (severity, affected versions) | within 10 working days |
| Fix or documented mitigation, high or critical | within 30 days of the assessment |
| Fix or documented mitigation, everything else | the next release |

A fix to the component library is published to npm and the advisory is recorded
against the affected versions. A fix to the site is deployed and noted here.

Reports made in good faith under this policy will not be pursued. That does not
extend to denial of service against the live site, or to accessing another
person's demo account beyond the point needed to demonstrate the problem.

## Supported versions

The showcase site is a single deployment; only what is live is supported. For
the component library, the current minor release receives fixes. Older minors do
not — the library is pre-1.0 and adopters should track the current release.
