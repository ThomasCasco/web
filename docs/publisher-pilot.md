# WaitAds — Publisher Pilot Brief

## One-liner
WaitAds is a companion for AI coding agents that turns legitimate agent wait time into a new, clearly-labeled advertising surface and shares part of publisher revenue with developers.

## Product flow
1. A developer starts a real coding-agent task.
2. WaitAds receives normalized lifecycle events from the agent adapter.
3. While the turn is active, WaitAds may render one clearly-labeled contextual ad placement.
4. The ad never gates, delays, or changes access to the coding-agent result.
5. When the turn completes, WaitAds closes the placement and records eligible usage/impression data.
6. Revenue-sharing, if enabled by the advertising partner, is based on legitimate usage and never on ad clicks.

## Privacy principles
- Never send raw prompts to advertisers.
- Never send source code, file contents, secrets, terminal output, or repository contents to advertisers.
- Targeting should use only coarse contextual signals such as broad category, technology family, country/region, and placement metadata.
- Ad clicks must never increase the user reward.
- The coding-agent result must never require viewing or interacting with an ad.

## Pilot proposal for an ad network
We want to validate a new developer advertising surface around AI coding agents.

A pilot should answer:
- Can the network serve a standard contextual ad inside the WaitAds placement?
- Does the network permit WaitAds to share a portion of publisher revenue with developers based on legitimate product usage, while never rewarding clicks?
- What impression/viewability requirements should WaitAds implement?
- What frequency caps and invalid-traffic protections should be used?
- Can a small controlled beta be approved before standard traffic thresholds are reached?

## Demo requirements before outreach
- Public landing page explaining WaitAds.
- Working agent lifecycle demo.
- Clearly-labeled sponsored placement visible only during an active turn.
- Mock wallet/revenue-share UI marked as demo data.
- Privacy page.
- Architecture diagram.
- Short screen recording/GIF showing a full session.
- Contact email and founder identity.

## Suggested outreach framing
WaitAds is not a paid-to-click product. Developers use it because it accompanies real AI coding work. Ads are an optional monetization layer shown during legitimate agent execution. We never reward clicks and never gate the coding result. We want written approval before enabling any revenue-sharing model with a partner's inventory.

## Success criteria for first partner conversation
A useful response is one of:
1. Written approval for a small pilot and revenue-sharing model.
2. A list of required product/policy changes before approval.
3. A concrete traffic threshold at which they would reconsider.

Until a network explicitly approves revenue sharing, production integrations must not claim that users earn cash from that network's impressions.
